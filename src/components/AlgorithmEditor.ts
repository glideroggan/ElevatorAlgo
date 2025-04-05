// We no longer need to import Monaco - it's provided by CDN
import { IElevatorAlgorithm } from '../algorithms/IElevatorAlgorithm';
import { BaseElevatorAlgorithm } from '../algorithms/BaseElevatorAlgorithm';

export class AlgorithmEditor {
  private editor: any = null;
  private container: HTMLElement;
  private saveCallback: ((code: string) => void) | null = null;
  
  // Template code for a new algorithm - completely fixed and cleaned up
//   private readonly TEMPLATE_CODE = `// Your elevator algorithm
// // Note: These imports are for type checking in the editor only.
// // They will be handled differently at runtime.
// import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
// import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

// /**
//  * Custom elevator algorithm
//  * Implement your logic in the methods below
//  */
// export class CustomAlgorithm extends BaseElevatorAlgorithm {
//     // Define properties in constructor to avoid TypeScript class field issues
//     constructor() {
//         super();
//         this.name = "My Custom Algorithm";
//         this.description = "A custom algorithm created in the editor";
//     }

//     /**
//      * Decide which elevator to assign to a person waiting on a floor
//      * @param person The person requesting an elevator
//      * @param startFloor The floor where the person is waiting
//      * @param building Current state of the building and elevators
//      * @returns Index of the elevator to assign (0 to number of elevators - 1)
//      */
//     assignElevatorToPerson(person, startFloor, building) {
//         // Example: Assign to least busy elevator
//         let leastBusyIndex = 0;
//         let leastBusyLoad = Infinity;
        
//         building.elevators.forEach((elevator, index) => {
//             if (elevator.passengers < leastBusyLoad && !elevator.isInRepair) {
//                 leastBusyLoad = elevator.passengers;
//                 leastBusyIndex = index;
//             }
//         });
        
//         return leastBusyIndex;
//     }
    
//     /**
//      * Decide which floor an elevator should go to next
//      * @param elevator The elevator that needs to decide where to go
//      * @param building Current state of the building and elevators
//      * @returns The floor number the elevator should visit next
//      */
//     decideNextFloor(elevator, building) {
//         // If no floors to visit, stay where we are
//         if (elevator.floorsToVisit.length === 0) {
//             return elevator.currentFloor;
//         }
        
//         // Get elevator-specific floor stats using utility method
//         const elevatorFloorStats = this.getElevatorFloorStats(elevator, building);
        
//         // Find any urgent floors (people waiting too long)
//         const urgentFloors = elevatorFloorStats
//             .filter(stat => stat.waitingCount > 0 && stat.maxWaitTime > 20)
//             .sort((a, b) => b.maxWaitTime - a.maxWaitTime);
            
//         if (urgentFloors.length > 0) {
//             return urgentFloors[0].floor;
//         }
        
//         // Otherwise go to closest floor to visit
//         return this.findClosestFloor(
//             elevator.currentFloor, 
//             elevator.floorsToVisit.filter(f => f !== elevator.currentFloor)
//         );
//     }
// }`;

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
      </div>
    `;
    this.container.parentElement?.insertBefore(typescriptNotice, this.container);
  }

  private async setupEditor(): Promise<void> {
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

    // load template code from local storage or server
    const templateCode = await this.loadTemplateCode();

    // Create editor
    this.editor = monaco.editor.create(this.container, {
      value: templateCode,
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

  private async loadTemplateCode(): Promise<string> {
    // Load template code from a local file or server
    // check if we have specific key stored in local storage, then use that
    // otherwise fetch from server
    const storedCode = localStorage.getItem('elevatorAlgorithmCode');
    if (storedCode) {
        return storedCode;
    }
    
    const response = await fetch('example.ts');
    if (response.ok) {
        const text = await response.text();
        localStorage.setItem('elevatorAlgorithmCode', text); // Store for future use
        return text;
    } else {
        console.error("Failed to load template code from server.");
        return ""
    }
  }

  private async addTypeDefinitions(monaco: any): Promise<void> {
    // TODO: add these via fetch instead
    const content = await fetch('/algorithms/IElevatorAlgorithm.d.ts')
    if (content.ok) {
        const text = await content.text();
        monaco.languages.typescript.typescriptDefaults.addExtraLib(text)
        console.log("Type definitions added successfully.");
    }

    // Add type definitions for our interfaces
    // monaco.languages.typescript.typescriptDefaults.addExtraLib(`
    //   declare module "../IElevatorAlgorithm" {
    //     export interface PersonData {
    //       startFloor: number;
    //       destinationFloor: number;
    //       waitTime: number;
    //     }
        
    //     export interface ElevatorData {
    //       id: number;
    //       currentFloor: number;
    //       targetFloor: number | null;
    //       state: string;
    //       direction: number;
    //       passengers: number;
    //       capacity: number;
    //       floorsToVisit: number[];
    //       passengerDestinations: number[];
    //       isInRepair: boolean;
    //     }
        
    //     export interface FloorStats {
    //       floor: number;
    //       waitingCount: number;
    //       totalMaxWaitTime: number;
    //       totalAvgWaitTime: number;
    //       perElevatorStats?: any[];
    //     }
        
    //     export interface BuildingData {
    //       totalFloors: number;
    //       totalElevators: number;
    //       elevators: ElevatorData[];
    //       floorStats: FloorStats[];
    //     }
    //   }
      
    //   declare module "../BaseElevatorAlgorithm" {
    //     import { PersonData, BuildingData, ElevatorData, FloorStats } from "../IElevatorAlgorithm";
        
    //     export abstract class BaseElevatorAlgorithm {
    //       abstract readonly name: string;
    //       abstract readonly description: string;
          
    //       abstract assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number;
    //       abstract decideNextFloor(elevator: ElevatorData, building: BuildingData): number;
          
    //       protected findClosestFloor(currentFloor: number, floors: number[]): number;
    //       protected calculateDistanceToFloor(elevator: ElevatorData, floor: number): number;
    //       protected isFloorInSameDirection(elevator: ElevatorData, floor: number): boolean;
    //       protected getElevatorFloorStats(elevator: ElevatorData, building: BuildingData): {
    //         floor: number;
    //         waitingCount: number;
    //         maxWaitTime: number;
    //         avgWaitTime: number;
    //         isInVisitList: boolean;
    //       }[];
    //     }
    //   }
    // `, 'ts:filename/elevator-types.d.ts');
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
    ['Empty Template'].forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = name;
      exampleSelect.appendChild(option);
    });
    
    exampleSelect.onchange = (e) => {
      const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
      this.loadExample(0);
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

  private async resetCode(): Promise<void> {
    if (this.editor) {
        const code = await this.loadTemplateCode()
      this.editor.setValue(code);
    }
  }

  private async loadExample(index: number=0): Promise<void> {
    if (!this.editor) return;
    
    switch (index) {
      case 0:
        const code = await this.loadTemplateCode();
        this.editor.setValue(code);
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
