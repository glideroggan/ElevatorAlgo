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
      delete (window as any)._evaluatedAlgorithm;
      
      // Basic validation
      if (!code.includes('extends BaseElevatorAlgorithm')) {
        throw new Error('Algorithm must extend BaseElevatorAlgorithm');
      }
      
      if (!code.includes('assignElevatorToPerson') || !code.includes('decideNextFloor')) {
        throw new Error('Algorithm must implement assignElevatorToPerson and decideNextFloor methods');
      }
      
      // First, normalize the TypeScript class fields to use constructor
      const normalizedCode = this.normalizeClassFields(code);
      
      // Use TypeScript transpiler if available to convert TypeScript to JavaScript
      if ((window as any).ts) {
        const transpiled = (window as any).ts.transpile(normalizedCode, {
          target: (window as any).ts.ScriptTarget.ES2015,
          module: (window as any).ts.ModuleKind.ESNext
        });
        code = transpiled;
      } else {
        code = normalizedCode;
      }
      
      // Create temporary script in memory - properly await the async method
      const scriptUrl = await this.createBlobUrl(code);
      
      try {
        // Import the code as a module - this will execute the script but the actual
        // algorithm class will be accessed through window._evaluatedAlgorithm
        await import(/* webpackIgnore: true */ scriptUrl);
        
        // Get the algorithm class from the window object where we stored it
        const AlgorithmClass = (window as any)._evaluatedAlgorithm;
        
        if (!AlgorithmClass) {
          throw new Error('No algorithm class found extending BaseElevatorAlgorithm');
        }
        
        // Create an instance
        const algorithmInstance = new AlgorithmClass();
        
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
        delete (window as any)._evaluatedAlgorithm;
      }
    } catch (error:any) {
      this.errorState = error.message || 'Unknown error evaluating algorithm';
      console.error('Error evaluating custom algorithm:', error);
      return false;
    }
  }

  private async imports(lib: string): Promise<any> {
    try {
      return await import(lib);
    } catch (error) {
      console.error(`Failed to import ${lib}:`, error);
      // Return an empty object as fallback
      return {};
    }
  }

  private async createBlobUrl(code: string): Promise<string> {
    // Define a completely self-contained script with everything needed
    // This avoids any dependencies on external modules or global variables
    const modifiedCode = `
      // Self-contained isolated environment
      (() => {
        // Define required interfaces
        const PersonData = {};
        const BuildingData = {};
        const ElevatorData = {};
        const FloorStats = {};
        
        // Define the BaseElevatorAlgorithm directly here to avoid any external dependencies
        class BaseElevatorAlgorithm {
          name = '';
          description = '';
          
          constructor() {}
          
          // Helper methods that algorithms can use
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
            if (elevator.state === 'IDLE') {
              return Math.abs(elevator.currentFloor - floor);
            } else if (elevator.state === 'MOVING_UP') {
              if (floor >= elevator.currentFloor) {
                return floor - elevator.currentFloor;
              } else {
                return (
                  elevator.targetFloor - elevator.currentFloor +
                  (elevator.targetFloor - floor)
                );
              }
            } else if (elevator.state === 'MOVING_DOWN') {
              if (floor <= elevator.currentFloor) {
                return elevator.currentFloor - floor;
              } else {
                return (
                  elevator.currentFloor - elevator.targetFloor +
                  (floor - elevator.targetFloor)
                );
              }
            }
            return Math.abs(elevator.currentFloor - floor);
          }
          
          isFloorInSameDirection(elevator, floor) {
            if (elevator.state === 'IDLE') return true;
            
            const currentFloor = elevator.currentFloor;
            const direction = elevator.direction;
            
            if (direction > 0) { // Going up
              return floor > currentFloor;
            } else if (direction < 0) { // Going down
              return floor < currentFloor;
            }
            
            return true; // Default to true for other states
          }
          
          getElevatorFloorStats(elevator, building) {
            return building.floorStats.map(floorStat => {
              // Find elevator-specific data if available
              const elevatorData = floorStat.perElevatorStats?.find(data => 
                data.elevatorId === elevator.id
              );
              
              return {
                floor: floorStat.floor,
                waitingCount: elevatorData?.waitingCount || 0,
                maxWaitTime: elevatorData?.maxWaitTime || 0,
                avgWaitTime: elevatorData?.avgWaitTime || 0,
                // Include whether this floor is in the elevator's visit list
                isInVisitList: elevator.floorsToVisit.includes(floorStat.floor)
              };
            }).filter(stat => stat.waitingCount > 0 || stat.isInVisitList);
          }
        }
        
        // Add the user's code without any imports
        ${code
          .replace(/import\s+.*?from\s+(['"]).*?\1;?/g, '// Import removed')
          .replace(/export\s+class\s+(\w+)/g, 'class $1')
        }
        
        // Export the algorithm class through the window object
        try {
          // Try to find any class that extends BaseElevatorAlgorithm
          for (const key in this) {
            if (this[key] && 
                typeof this[key] === 'function' && 
                this[key].prototype instanceof BaseElevatorAlgorithm) {
              window._evaluatedAlgorithm = this[key];
              console.log('Found algorithm class:', key);
              break;
            }
          }
          
          // If not found by prototype check, try by name (more reliable in some browsers)
          if (!window._evaluatedAlgorithm) {
            if (typeof CustomAlgorithm === 'function') {
              window._evaluatedAlgorithm = CustomAlgorithm;
              console.log('Found algorithm by name: ', CustomAlgorithm.name);
            } else {
              console.error('Could not find any class extending BaseElevatorAlgorithm');
            }
          }
        } catch (e) {
          console.error('Error finding algorithm class:', e);
        }
      })();
      
      // Return a dummy export to make the module system happy
      export default {};
    `;
    
    console.debug("Modified code for evaluation:", modifiedCode);
    
    const blob = new Blob([modifiedCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  /**
   * Convert readonly class field syntax to constructor initialization
   * to better support execution in non-transpiled environments
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
