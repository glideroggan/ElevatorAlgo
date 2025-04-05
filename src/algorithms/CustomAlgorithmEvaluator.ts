import { IElevatorAlgorithm } from './IElevatorAlgorithm';
import { BaseElevatorAlgorithm } from './BaseElevatorAlgorithm';
import { TranspiledAlgorithm } from './TranspiledAlgorithm';

export class CustomAlgorithmEvaluator {
  private static instance: CustomAlgorithmEvaluator;
  private customAlgorithm: IElevatorAlgorithm | null = null;
  private errorState: string | null = null;

  // Cache for dependency files
  private dependencyCache: Map<string, string> = new Map();

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
      
      // Fetch dependency files needed by the algorithm
      await this.fetchDependencies();
      
      // Compile the code using TypeScript
      const compiledCode = await this.compileWithDependencies(code);
      
      // Create a module bundle that includes all dependencies
      const scriptUrl = this.createModuleBundle(compiledCode);
      
      try {
        // Import the code as a module
        await import(/* webpackIgnore: true */ scriptUrl);
        
        // Get the algorithm class from the window object
        const AlgorithmClass = window._evaluatedAlgorithm as unknown as new () => IElevatorAlgorithm;
        
        if (!AlgorithmClass) {
          throw new Error('No algorithm class found extending BaseElevatorAlgorithm');
        }
        
        // Make sure the class is constructable
        if (typeof AlgorithmClass !== 'function') {
          throw new Error(`Algorithm class is not a constructor function (got ${typeof AlgorithmClass})`);
        }
        
        // Create an instance with better error handling
        let algorithmInstance;
        try {
            console.log('Creating algorithm instance:', AlgorithmClass.name);
            algorithmInstance = new AlgorithmClass();
        } catch (constructError:any) {
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
        URL.revokeObjectURL(scriptUrl);
        
        // Clean up global reference
        delete window._evaluatedAlgorithm;
      }
    } catch (error:any) {
      this.errorState = error.message || 'Unknown error evaluating algorithm';
      console.error('Error evaluating custom algorithm:', error);
      return false;
    }
  }

  /**
   * Fetch all dependencies needed by the algorithm
   */
  private async fetchDependencies(): Promise<void> {
    // List of essential dependencies
    const dependencies = [
      '/algorithms/BaseElevatorAlgorithm.js',
      '/algorithms/IElevatorAlgorithm.js'
    ];
    
    // Fetch all dependencies in parallel
    await Promise.all(dependencies.map(async (path) => {
      if (!this.dependencyCache.has(path)) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const content = await response.text();
            this.dependencyCache.set(path, content);
            console.debug(`Fetched dependency: ${path}`);
          } else {
            console.error(`Failed to fetch dependency: ${path}`);
          }
        } catch (error) {
          console.error(`Error fetching dependency ${path}:`, error);
        }
      }
    }));
  }

  /**
   * Compile the user's code with dependencies using TypeScript
   */
  private async compileWithDependencies(code: string): Promise<string> {
    if (window.ts && typeof window.ts.transpile === 'function') {
      console.debug('Using TypeScript compiler for transpilation');
      
      try {
        // If Monaco is available, we can use it to create proper modules
        if (window.monaco) {
          // Create models for all dependencies
          const baseAlgoContent = this.dependencyCache.get('/algorithms/BaseElevatorAlgorithm.js') || '';
          const interfaceContent = this.dependencyCache.get('/algorithms/IElevatorAlgorithm.js') || '';
          
          // Register models with Monaco
          window.monaco.editor.createModel(baseAlgoContent, 'typescript', window.monaco.Uri.parse('file:///BaseElevatorAlgorithm.ts'));
          window.monaco.editor.createModel(interfaceContent, 'typescript', window.monaco.Uri.parse('file:///IElevatorAlgorithm.ts'));
          
          // Update import paths in the user code to match our virtual file structure
          const updatedCode = code
            .replace(/from ['"]\.\.\/BaseElevatorAlgorithm['"]/g, 'from "./BaseElevatorAlgorithm"')
            .replace(/from ['"]\.\.\/IElevatorAlgorithm['"]/g, 'from "./IElevatorAlgorithm"');
          
          // Create model for user code
          window.monaco.editor.createModel(updatedCode, 'typescript', window.monaco.Uri.parse('file:///CustomAlgorithm.ts'));
        }
        
        // Now transpile the code with proper module resolution
        const transpiled = window.ts.transpile(code, {
          target: window.ts.ScriptTarget.ES2015,
          module: window.ts.ModuleKind.Script,
          experimentalDecorators: true,
          moduleResolution: 2, // NodeJs resolution if available
          allowSyntheticDefaultImports: true
        });
        
        console.debug('TypeScript transpilation successful');
        return transpiled;
      } catch (error) {
        console.error('Error during TypeScript compilation:', error);
        throw new Error(`TypeScript compilation error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Fallback to basic type erasure
      console.warn('TypeScript transpiler not available, using type erasure');
      return this.typeErasure(code);
    }
  }

  /**
   * Create a JavaScript module bundle with the compiled code and dependencies
   */
  private createModuleBundle(compiledCode: string): string {
    // Create a module that includes all dependencies and exports
    const bundle = `
      // Module bundle with dependencies
      (function() {
        // Define BaseElevatorAlgorithm
        class BaseElevatorAlgorithm {
          name = '';
          description = '';
          
          // Helper methods
          findClosestFloor(currentFloor, floors) {
            if (floors.length === 0) return currentFloor;
            
            let closestFloor = floors[0];
            let shortestDistance = Math.abs(currentFloor - closestFloor);
            
            for (const floor of floors) {
              const distance = Math.abs(currentFloor - floor);
              if (distance < shortestDistance) {
                shortestDistance = distance;
                closestFloor = floor;
              }
            }
            
            return closestFloor;
          }
          
          calculateDistanceToFloor(elevator, floor) {
            // ... existing code ...
            return Math.abs(elevator.currentFloor - floor);
          }
          
          isFloorInSameDirection(elevator, floor) {
            // ... existing code ...
            return true;
          }
          
          getElevatorFloorStats(elevator, building) {
            // ... existing code ...
            return [];
          }
        }
        
        // Make BaseElevatorAlgorithm globally available
        window.BaseElevatorAlgorithm = BaseElevatorAlgorithm;
        
        // Add the user's compiled code - imports are resolved
        try {
          ${compiledCode}
          
          // Find the algorithm class that extends BaseElevatorAlgorithm
          for (const key in this) {
            try {
              if (this[key] && 
                  typeof this[key] === 'function' && 
                  this[key].prototype instanceof BaseElevatorAlgorithm) {
                window._evaluatedAlgorithm = this[key];
                console.log('Found algorithm class:', key);
                break;
              }
            } catch (err) {
              // Skip errors when checking properties
            }
          }
        } catch (e) {
          console.error('Error executing algorithm code:', e);
        }
      })();
      
      // Return a dummy export to make the module system happy
      export default {};
    `;
    
    const blob = new Blob([bundle], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  /**
   * Simple type erasure as a fallback if TypeScript transpiler isn't available
   */
  private typeErasure(code: string): string {
    // Remove type annotations (param: Type -> param)
    let jsCode = code.replace(/:\s*([a-zA-Z0-9_<>[\]|,\s.]+)(?=[,)]|$)/g, '');
    
    // Remove generic type parameters (<T> or <T, U>)
    jsCode = jsCode.replace(/<[^<>(){}]*>/g, '');
    
    // Remove interface and type declarations
    jsCode = jsCode.replace(/interface\s+\w+\s*{[^}]*}/g, '');
    jsCode = jsCode.replace(/type\s+\w+\s*=\s*[^;]*;/g, '');
    
    return jsCode;
  }

  /**
   * Convert readonly class field syntax to constructor initialization
   * to better support execution in the browser
   */
  private normalizeClassFields(code: string): string {
    // Match class definitions - updated to handle 'export class' syntax properly
    const classRegex = /(?:export\s+)?class\s+(\w+)\s+extends\s+BaseElevatorAlgorithm\s*{([^}]*)}/gs;
    
    return code.replace(classRegex, (match, className, classBody) => {
      // Look for readonly fields or regular class fields
      const fieldRegex = /\s+(readonly\s+)?(\w+)\s*=\s*(['"`].*?['"`]|\d+|\{.*?\}|\[.*?\])/g;
      const fields: {name: string, value: string}[] = [];
      
      let fieldMatch;
      let processedBody = classBody;
      
      // Extract all class fields
      while ((fieldMatch = fieldRegex.exec(classBody))) {
        const fieldName = fieldMatch[2];
        const fieldValue = fieldMatch[3];
        fields.push({ name: fieldName, value: fieldValue });
        
        // Remove the field declaration from the class body
        processedBody = processedBody.replace(fieldMatch[0], '');
      }
      
      // Only modify constructor if we actually found class fields to move
      if (fields.length > 0) {
        // Look for existing constructor
        const constructorRegex = /constructor\s*\([^)]*\)\s*{([^}]*)}/s;
        const constructorMatch = processedBody.match(constructorRegex);
        
        if (constructorMatch) {
          // Add field assignments to existing constructor
          const constructorBody = constructorMatch[1];
          const fieldAssignments = fields.map(f => `        this.${f.name} = ${f.value};`).join('\n');
          const newConstructorBody = `{\n        super();\n${fieldAssignments}\n${constructorBody}\n    }`;
          
          // Make sure the super() call isn't duplicated
          const finalConstructorBody = newConstructorBody.replace(/super\(\);[\s\n]*super\(\);/g, 'super();');
          processedBody = processedBody.replace(constructorRegex, `constructor() ${finalConstructorBody}`);
        } else {
          // Create a new constructor with field assignments
          const fieldAssignments = fields.map(f => `        this.${f.name} = ${f.value};`).join('\n');
          const constructor = `    constructor() {\n        super();\n${fieldAssignments}\n    }\n`;
          
          // Add constructor to the beginning of the class body
          processedBody = `\n${constructor}${processedBody}`;
        }
      }
      
      // Just return the class - no module.exports
      return `class ${className} extends BaseElevatorAlgorithm {${processedBody}}`;
    });
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
