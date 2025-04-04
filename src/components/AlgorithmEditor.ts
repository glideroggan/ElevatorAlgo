// We no longer need to import Monaco - it's provided by CDN
import { IElevatorAlgorithm } from '../algorithms/IElevatorAlgorithm';
import { BaseElevatorAlgorithm } from '../algorithms/BaseElevatorAlgorithm';

export class AlgorithmEditor {
  private editor: any = null;
  private container: HTMLElement;
  private saveCallback: ((code: string) => void) | null = null;
  
  // Template code for a new algorithm - completely fixed and cleaned up
  private readonly TEMPLATE_CODE = `// Your elevator algorithm
// Note: These imports are for type checking in the editor only.
// They will be handled differently at runtime.
import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

/**
 * Custom elevator algorithm
 * Implement your logic in the methods below
 */
export class CustomAlgorithm extends BaseElevatorAlgorithm {
    // Define properties in constructor to avoid TypeScript class field issues
    constructor() {
        super();
        this.name = "My Custom Algorithm";
        this.description = "A custom algorithm created in the editor";
    }

    /**
     * Decide which elevator to assign to a person waiting on a floor
     * @param person The person requesting an elevator
     * @param startFloor The floor where the person is waiting
     * @param building Current state of the building and elevators
     * @returns Index of the elevator to assign (0 to number of elevators - 1)
     */
    assignElevatorToPerson(person, startFloor, building) {
        // Example: Assign to least busy elevator
        let leastBusyIndex = 0;
        let leastBusyLoad = Infinity;
        
        building.elevators.forEach((elevator, index) => {
            if (elevator.passengers < leastBusyLoad && !elevator.isInRepair) {
                leastBusyLoad = elevator.passengers;
                leastBusyIndex = index;
            }
        });
        
        return leastBusyIndex;
    }
    
    /**
     * Decide which floor an elevator should go to next
     * @param elevator The elevator that needs to decide where to go
     * @param building Current state of the building and elevators
     * @returns The floor number the elevator should visit next
     */
    decideNextFloor(elevator, building) {
        // If no floors to visit, stay where we are
        if (elevator.floorsToVisit.length === 0) {
            return elevator.currentFloor;
        }
        
        // Get elevator-specific floor stats using utility method
        const elevatorFloorStats = this.getElevatorFloorStats(elevator, building);
        
        // Find any urgent floors (people waiting too long)
        const urgentFloors = elevatorFloorStats
            .filter(stat => stat.waitingCount > 0 && stat.maxWaitTime > 20)
            .sort((a, b) => b.maxWaitTime - a.maxWaitTime);
            
        if (urgentFloors.length > 0) {
            return urgentFloors[0].floor;
        }
        
        // Otherwise go to closest floor to visit
        return this.findClosestFloor(
            elevator.currentFloor, 
            elevator.floorsToVisit.filter(f => f !== elevator.currentFloor)
        );
    }
}`;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element not found: ${containerId}`);
    }
    this.container = container;
    
    // Wait for Monaco to be fully loaded from CDN before setting up editor
    if ((window as any).monaco) {
      this.setupEditor();
    } else {
      // If Monaco isn't loaded yet, wait for it (it should be loaded by the time this runs)
      console.log("Waiting for Monaco to load...");
      window.onload = () => {
        this.setupEditor();
      };
    }
    
    // Add a clear TypeScript notice in the editor
    const typescriptNotice = document.createElement('div');
    typescriptNotice.className = 'typescript-notice';
    typescriptNotice.innerHTML = `
      <div class="info-message">
        <strong>TypeScript Editor Tips:</strong> 
        <ul>
          <li>The editor provides TypeScript syntax highlighting and code completion</li>
          <li>Base class methods like <code>findClosestFloor</code>, <code>getElevatorFloorStats</code>, etc. are available to your class</li>
          <li>Ignore any import errors - they're for editor support only</li>
          <li>Use constructor initialization: <code>this.name = "My Algorithm"</code> rather than class fields</li>
        </ul>
      </div>
    `;
    this.container.parentElement?.insertBefore(typescriptNotice, this.container);
  }

  private setupEditor(): void {
    const monaco = (window as any).monaco;
    if (!monaco) {
      console.error("Monaco editor not loaded!");
      return;
    }

    // Initialize Monaco Editor
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2015,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ["node_modules/@types"],
      lib: ["es2015"]
    });

    // Add type definitions for the elevator algorithm interface
    this.addTypeDefinitions(monaco);

    // Create editor
    this.editor = monaco.editor.create(this.container, {
      value: this.TEMPLATE_CODE,
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      folding: true
    });

    // Create UI controls
    this.createControls();
  }

  private addTypeDefinitions(monaco: any): void {
    // Add type definitions for our interfaces
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module "../IElevatorAlgorithm" {
        export interface PersonData {
          startFloor: number;
          destinationFloor: number;
          waitTime: number;
        }
        
        export interface ElevatorData {
          id: number;
          currentFloor: number;
          targetFloor: number | null;
          state: string;
          direction: number;
          passengers: number;
          capacity: number;
          floorsToVisit: number[];
          passengerDestinations: number[];
          isInRepair: boolean;
        }
        
        export interface FloorStats {
          floor: number;
          waitingCount: number;
          totalMaxWaitTime: number;
          totalAvgWaitTime: number;
          perElevatorStats?: any[];
        }
        
        export interface BuildingData {
          totalFloors: number;
          totalElevators: number;
          elevators: ElevatorData[];
          floorStats: FloorStats[];
        }
      }
      
      declare module "../BaseElevatorAlgorithm" {
        import { PersonData, BuildingData, ElevatorData, FloorStats } from "../IElevatorAlgorithm";
        
        export abstract class BaseElevatorAlgorithm {
          abstract readonly name: string;
          abstract readonly description: string;
          
          abstract assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number;
          abstract decideNextFloor(elevator: ElevatorData, building: BuildingData): number;
          
          protected findClosestFloor(currentFloor: number, floors: number[]): number;
          protected calculateDistanceToFloor(elevator: ElevatorData, floor: number): number;
          protected isFloorInSameDirection(elevator: ElevatorData, floor: number): boolean;
          protected getElevatorFloorStats(elevator: ElevatorData, building: BuildingData): {
            floor: number;
            waitingCount: number;
            maxWaitTime: number;
            avgWaitTime: number;
            isInVisitList: boolean;
          }[];
        }
      }
    `, 'ts:filename/elevator-types.d.ts');
  }

  private createControls(): void {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'editor-controls';
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Apply Algorithm';
    saveButton.className = 'editor-button save-button';
    saveButton.onclick = () => this.saveCode();
    
    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Template';
    resetButton.className = 'editor-button reset-button';
    resetButton.onclick = () => this.resetCode();
    
    // Load example dropdown
    const exampleLabel = document.createElement('label');
    exampleLabel.textContent = 'Load example:';
    exampleLabel.className = 'example-label';
    
    const exampleSelect = document.createElement('select');
    exampleSelect.className = 'example-select';
    
    // Add example options
    ['Empty Template', 'Simple Algorithm', 'Wait Time Priority', 'SCAN Algorithm'].forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = name;
      exampleSelect.appendChild(option);
    });
    
    exampleSelect.onchange = (e) => {
      const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
      this.loadExample(selectedIndex);
    };
    
    controlsContainer.appendChild(exampleLabel);
    controlsContainer.appendChild(exampleSelect);
    controlsContainer.appendChild(saveButton);
    controlsContainer.appendChild(resetButton);
    
    this.container.parentElement?.insertBefore(controlsContainer, this.container);
  }

  private saveCode(): void {
    if (this.editor && this.saveCallback) {
      const code = this.editor.getValue();
      this.saveCallback(code);
    }
  }

  private resetCode(): void {
    if (this.editor) {
      this.editor.setValue(this.TEMPLATE_CODE);
    }
  }

  private loadExample(index: number): void {
    if (!this.editor) return;
    
    switch (index) {
      case 0:
        this.editor.setValue(this.TEMPLATE_CODE);
        break;
      case 1:
        this.editor.setValue(`// Simple algorithm example
import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class SimpleExample extends BaseElevatorAlgorithm {
    constructor() {
        super();
        this.name = "Simple Example";
        this.description = "A basic elevator algorithm that prefers close elevators";
    }

    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        let bestElevator = 0;
        let shortestDistance = Infinity;
        
        building.elevators.forEach((elevator, index) => {
            // Skip full elevators
            if (elevator.passengers >= elevator.capacity) return;
            
            const distance = this.calculateDistanceToFloor(elevator, startFloor);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                bestElevator = index;
            }
        });
        
        return bestElevator;
    }
    
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        // No floors to visit
        if (elevator.floorsToVisit.length === 0) {
            return elevator.currentFloor;
        }
        
        // If this elevator is full, prioritize dropoffs first
        if (elevator.passengers >= elevator.capacity) {
            const dropOffFloors = elevator.passengerDestinations;
            if (dropOffFloors.length > 0) {
                return this.findClosestFloor(elevator.currentFloor, Array.from(dropOffFloors));
            }
        }
        
        // Otherwise, find closest floor to visit
        const floorsToVisit = elevator.floorsToVisit.filter(f => f !== elevator.currentFloor);
        if (floorsToVisit.length === 0) return elevator.currentFloor;
        
        return this.findClosestFloor(elevator.currentFloor, floorsToVisit);
    }
}`);
        break;
      case 2:
        this.editor.setValue(`// Wait time priority algorithm
import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class WaitTimePriorityAlgorithm extends BaseElevatorAlgorithm {
    constructor() {
        super();
        this.name = "Wait Time Priority";
        this.description = "Prioritizes floors with people waiting a long time";
        this.URGENT_WAIT_TIME = 20; // Threshold for urgent attention (seconds)
    }
    
    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        // Find elevator with best combined score of:
        // - Distance to pickup
        // - Current load
        // - Whether it's going in the right direction
        
        let bestElevatorIndex = 0;
        let bestScore = -Infinity;
        
        building.elevators.forEach((elevator, index) => {
            if (elevator.passengers >= elevator.capacity || elevator.isInRepair) return;
            
            const distance = this.calculateDistanceToFloor(elevator, startFloor);
            const loadFactor = 1 - (elevator.passengers / elevator.capacity);
            const directionalBonus = this.isFloorInSameDirection(elevator, startFloor) ? 500 : 0;
            
            const score = 1000 - (distance * 100) + (loadFactor * 300) + directionalBonus;
            
            if (score > bestScore) {
                bestScore = score;
                bestElevatorIndex = index;
            }
        });
        
        return bestElevatorIndex;
    }
    
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        if (elevator.floorsToVisit.length === 0) return elevator.currentFloor;
        
        const floorsToVisit = elevator.floorsToVisit.filter(f => f !== elevator.currentFloor);
        if (floorsToVisit.length === 0) return elevator.currentFloor;
        
        // Get elevator-specific stats
        const elevatorFloorStats = this.getElevatorFloorStats(elevator, building);
        
        // Check for urgent wait times
        const urgentFloors = elevatorFloorStats
            .filter(stat => stat.waitingCount > 0 && 
                    stat.maxWaitTime > this.URGENT_WAIT_TIME &&
                    elevator.floorsToVisit.includes(stat.floor))
            .sort((a, b) => b.maxWaitTime - a.maxWaitTime);
        
        // If we found urgent floors, go there first (unless elevator is full)
        if (urgentFloors.length > 0 && elevator.passengers < elevator.capacity) {
            console.debug(\`Prioritizing urgent floor \${urgentFloors[0].floor} with \${urgentFloors[0].maxWaitTime.toFixed(1)}s wait time\`);
            return urgentFloors[0].floor;
        }
        
        // If elevator is full, prioritize dropping off passengers
        if (elevator.passengers >= elevator.capacity) {
            if (elevator.passengerDestinations.length > 0) {
                return this.findClosestFloor(elevator.currentFloor, Array.from(elevator.passengerDestinations));
            }
        }
        
        // Otherwise, use a scan algorithm for efficiency
        if (elevator.direction !== 0) {
            const direction = elevator.direction;
            const floorsInCurrentDirection = floorsToVisit.filter(floor => 
                direction > 0 ? floor > elevator.currentFloor : floor < elevator.currentFloor);
            
            if (floorsInCurrentDirection.length > 0) {
                return direction > 0 
                    ? Math.min(...floorsInCurrentDirection)  // Lowest floor above current
                    : Math.max(...floorsInCurrentDirection); // Highest floor below current
            }
        }
        
        // If no better option, go to closest floor
        return this.findClosestFloor(elevator.currentFloor, floorsToVisit);
    }
}`);
        break;
      case 3:
        this.editor.setValue(`// SCAN Algorithm Implementation
import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class SCANAlgorithm extends BaseElevatorAlgorithm {
    constructor() {
        super();
        this.name = "SCAN Algorithm";
        this.description = "Implements the SCAN (elevator) algorithm for optimal movement";
    }

    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        let bestElevator = 0;
        let bestScore = -Infinity;
        
        building.elevators.forEach((elevator, index) => {
            if (elevator.passengers >= elevator.capacity || elevator.isInRepair) return;
            
            // Calculate score using multiple factors
            let score = 0;
            
            // Factor 1: Already going to that floor?
            if (elevator.floorsToVisit.includes(startFloor)) {
                score += 1000;
            }
            
            // Factor 2: Is the floor in the current direction of travel?
            if (this.isFloorInSameDirection(elevator, startFloor)) {
                score += 500;
            }
            
            // Factor 3: Distance (shorter is better)
            const distance = this.calculateDistanceToFloor(elevator, startFloor);
            score -= distance * 10;
            
            // Factor 4: Load (prefer less loaded elevators)
            score -= (elevator.passengers / elevator.capacity) * 200;
            
            if (score > bestScore) {
                bestScore = score;
                bestElevator = index;
            }
        });
        
        return bestElevator;
    }
    
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        if (elevator.floorsToVisit.length === 0) return elevator.currentFloor;
        
        const floorsToVisit = elevator.floorsToVisit.filter(f => f !== elevator.currentFloor);
        if (floorsToVisit.length === 0) return elevator.currentFloor;
        
        // SCAN Algorithm: Continue in current direction until no more floors,
        // then change direction and repeat
        
        // If no direction set, find closest floor and set direction
        if (elevator.direction === 0) {
            const closestFloor = this.findClosestFloor(elevator.currentFloor, floorsToVisit);
            return closestFloor;
        }
        
        // Continue in current direction if possible
        const direction = elevator.direction;
        const floorsInDirection = floorsToVisit.filter(floor => 
            direction > 0 ? floor > elevator.currentFloor : floor < elevator.currentFloor
        );
        
        if (floorsInDirection.length > 0) {
            // Continue in current direction to the next floor in sequence
            return direction > 0 
                ? Math.min(...floorsInDirection)  // Moving UP: get lowest floor above
                : Math.max(...floorsInDirection); // Moving DOWN: get highest floor below
        } 
        
        // No more floors in current direction, reverse direction
        const floorsInOppositeDirection = floorsToVisit.filter(floor => 
            direction > 0 ? floor < elevator.currentFloor : floor > elevator.currentFloor
        );
        
        if (floorsInOppositeDirection.length > 0) {
            // Start servicing floors in opposite direction
            return direction > 0
                ? Math.max(...floorsInOppositeDirection) // Moving up but now going down: start from highest
                : Math.min(...floorsInOppositeDirection); // Moving down but now going up: start from lowest
        }
        
        // Should not reach here if we have floors to visit
        return elevator.currentFloor;
    }
}`);
        break;
    }
  }

  public onSave(callback: (code: string) => void): void {
    this.saveCallback = callback;
  }

  public setValue(code: string): void {
    if (this.editor) {
      this.editor.setValue(code);
    }
  }

  public getValue(): string {
    return this.editor ? this.editor.getValue() : '';
  }
}
