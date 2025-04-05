import { IElevatorAlgorithm } from './IElevatorAlgorithm';
import { BaseElevatorAlgorithm } from './BaseElevatorAlgorithm';
import { TranspiledAlgorithm } from './TranspiledAlgorithm';

export class CustomAlgorithmEvaluator {
  private static instance: CustomAlgorithmEvaluator;
  private customAlgorithm: IElevatorAlgorithm | null = null;
  private errorState: string | null = null;

  private constructor() {}

  public static getInstance(): CustomAlgorithmEvaluator {
    if (!CustomAlgorithmEvaluator.instance) {
      CustomAlgorithmEvaluator.instance = new CustomAlgorithmEvaluator();
    }
    return CustomAlgorithmEvaluator.instance;
  }

  public async evaluateCode(code: string): Promise<boolean> {
    try {
      this.errorState = null;
      
      // Delete any previous evaluated algorithm
      delete window._evaluatedAlgorithm;
      
      // Basic validation
      if (!code.includes('extends BaseElevatorAlgorithm')) {
        throw new Error('Algorithm must extend BaseElevatorAlgorithm');
      }
      
      if (!code.includes('assignElevatorToPerson') || !code.includes('decideNextFloor')) {
        throw new Error('Algorithm must implement assignElevatorToPerson and decideNextFloor methods');
      }
      
      // Normalize import statements to use @elevator-base
      const normalizedCode = this.normalizeImports(code);
      
      // Compile the code using TypeScript, preserving ESM imports
      const compiledCode = await this.compileAsModule(normalizedCode);
      
      // Create an ES module from the compiled code
      const moduleUrl = URL.createObjectURL(
        new Blob([compiledCode], { type: 'text/javascript' })
      );
      
      try {
        // Import the compiled module
        const module = await import(/* webpackIgnore: true */ moduleUrl);
        console.debug('Module imported successfully:', module);
        
        // Find the algorithm class in the module exports
        const AlgorithmClass = this.findAlgorithmClass(module);
        
        if (!AlgorithmClass) {
          throw new Error('No algorithm class found extending BaseElevatorAlgorithm');
        }
        
        // Create an instance with better error handling
        let algorithmInstance;
        try {
          console.debug('Creating algorithm instance:', AlgorithmClass.name);
          algorithmInstance = new AlgorithmClass();
        } catch (constructError: any) {
          console.error('Construction error:', constructError);
          throw new Error(`Failed to create algorithm instance: ${constructError.message}`);
        }
        
        // Validate required properties and methods
        if (typeof algorithmInstance.assignElevatorToPerson !== 'function') {
          throw new Error('Algorithm must implement assignElevatorToPerson method');
        }
        
        if (typeof algorithmInstance.decideNextFloor !== 'function') {
          throw new Error('Algorithm must implement decideNextFloor method');
        }
        
        if (typeof algorithmInstance.name !== 'string') {
          throw new Error('Algorithm must have a name property');
        }
        
        if (typeof algorithmInstance.description !== 'string') {
          throw new Error('Algorithm must have a description property');
        }
        
        // Create a wrapped version that can be safely used
        this.customAlgorithm = new TranspiledAlgorithm(algorithmInstance);
        
        return true;
      } finally {
        // Clean up blob URL
        URL.revokeObjectURL(moduleUrl);
      }
    } catch (error: any) {
      this.errorState = error.message || 'Unknown error evaluating algorithm';
      console.error('Error evaluating custom algorithm:', error);
      return false;
    }
  }

  /**
   * Normalize imports to use the mapped imports from the HTML
   */
  private normalizeImports(code: string): string {
    // Replace imports from BaseElevatorAlgorithm to use the import map
    return code
      // Handle named imports from BaseElevatorAlgorithm
      .replace(/import\s*{\s*BaseElevatorAlgorithm\s*}\s*from\s+['"]@elevator-base['"]/g, 
               'import BaseElevatorAlgorithm from "@elevator-base"')
      .replace(/import\s*{\s*BaseElevatorAlgorithm\s*}\s*from\s+['"]\.\.\/BaseElevatorAlgorithm['"]/g, 
               'import BaseElevatorAlgorithm from "@elevator-base"')
      .replace(/import\s*{\s*BaseElevatorAlgorithm\s*}\s*from\s+['"]\.\/BaseElevatorAlgorithm['"]/g, 
               'import BaseElevatorAlgorithm from "@elevator-base"')
      // Keep other imports as they are but ensure .js extension
      .replace(/from\s+['"]\.\.\/IElevatorAlgorithm['"]/g, 'from "./IElevatorAlgorithm.js"')
      .replace(/from\s+['"]\.\/IElevatorAlgorithm['"]/g, 'from "./IElevatorAlgorithm.js"');
  }

  /**
   * Compile the code as an ES module
   */
  private async compileAsModule(code: string): Promise<string> {
    if (window.ts && typeof window.ts.transpile === 'function') {
      console.debug('Using TypeScript compiler for transpilation');
      
      try {
        // Now transpile the code as an ES module
        const options = {
          target: window.ts.ScriptTarget.ES2020,
          module: window.ts.ModuleKind.ESNext,
          experimentalDecorators: true,
          moduleResolution: 2, // NodeJs resolution
          allowSyntheticDefaultImports: true
        }
        console.debug('Transpiling code with options:', options);
        let transpiled = window.ts.transpile(code, options);
        
        // Log the transpiled code to debug exports
        console.debug('Transpiled code preview:', transpiled.substring(0, 200) + '...');
        
        // Ensure classes are properly exported by adding default export if needed
        if (!transpiled.includes('export default') && !transpiled.includes('export class')) {
          // Extract class name using regex
          const classNameMatch = /class\s+(\w+)\s+extends\s+BaseElevatorAlgorithm/.exec(transpiled);
          if (classNameMatch && classNameMatch[1]) {
            const className = classNameMatch[1];
            transpiled += `\nexport default ${className};`;
            console.debug(`Added default export for class: ${className}`);
          }
        }
        
        console.debug('TypeScript transpilation successful');
        return transpiled;
      } catch (error) {
        console.error('Error during TypeScript compilation:', error);
        throw new Error(`TypeScript compilation error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.warn('TypeScript transpiler not available');
      // Strip annotations but preserve imports/exports and add export if needed
      return this.typeErasureWithExports(code);
    }
  }

  /**
   * Create an ES module from code
   */
  private createModuleUrl(code: string): string {
    return URL.createObjectURL(
      new Blob([code], { type: 'text/javascript;charset=utf-8' })
    );
  }

  /**
   * Simple type erasure that preserves import/export statements and ensures exports
   */
  private typeErasureWithExports(code: string): string {
    // Remove type annotations
    let jsCode = code.replace(/:\s*([a-zA-Z0-9_<>[\]|,\s.]+)(?=[,)]|$)/g, '');
    
    // Remove generic type parameters
    jsCode = jsCode.replace(/<[^<>(){}]*>/g, '');
    
    // Remove interface and type declarations
    jsCode = jsCode.replace(/interface\s+\w+\s*{[^}]*}/g, '');
    jsCode = jsCode.replace(/type\s+\w+\s*=\s*[^;]*;/g, '');
    
    // Add export if needed
    if (!jsCode.includes('export default') && !jsCode.includes('export class')) {
      const classNameMatch = /class\s+(\w+)\s+extends\s+BaseElevatorAlgorithm/.exec(jsCode);
      if (classNameMatch && classNameMatch[1]) {
        const className = classNameMatch[1];
        jsCode += `\nexport default ${className};`;
      }
    }
    
    return jsCode;
  }

  /**
   * Find the algorithm class in the module exports
   */
  private findAlgorithmClass(module: any): (new () => IElevatorAlgorithm) | null {
    console.debug("Module keys:", Object.keys(module));
    
    // First check the default export which should be our algorithm class
    if (module.default && typeof module.default === 'function') {
      const DefaultClass = module.default;
      // Check if it's a valid algorithm class
      if (DefaultClass.prototype instanceof BaseElevatorAlgorithm || 
          (typeof DefaultClass.prototype.assignElevatorToPerson === 'function' && 
           typeof DefaultClass.prototype.decideNextFloor === 'function')) {
        return DefaultClass;
      }
    }
    
    // Then check other named exports
    for (const key in module) {
      if (key === 'default') continue; // Already checked
      
      const exportedItem = module[key];
      // Check if this is a class extending BaseElevatorAlgorithm
      if (typeof exportedItem === 'function') {
        // First try the direct inheritance check
        const extendsBaseAlgorithm = exportedItem.prototype instanceof BaseElevatorAlgorithm;
        
        // Also check for required methods as a fallback
        const hasRequiredMethods = 
          typeof exportedItem.prototype.assignElevatorToPerson === 'function' && 
          typeof exportedItem.prototype.decideNextFloor === 'function';
          
        // Accept the class if either condition is met
        if (extendsBaseAlgorithm || hasRequiredMethods) {
          return exportedItem;
        }
      }
    }
    return null;
  }

  public getCustomAlgorithm(): IElevatorAlgorithm | null {
    return this.customAlgorithm;
  }

  public getErrorState(): string | null {
    return this.errorState;
  }

  public clearCustomAlgorithm(): void {
    this.customAlgorithm = null;
    this.errorState = null;
  }
}
