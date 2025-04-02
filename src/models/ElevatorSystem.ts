import { Elevator, ElevatorState } from './Elevator';
import { Person } from './Person';
import { AlgorithmManager } from '../algorithms/AlgorithmManager';
import { 
  BuildingData, 
  ElevatorData, 
  FloorStats, 
  PersonData 
} from '../algorithms/IElevatorAlgorithm';

export class ElevatorSystem {
  private elevators: Elevator[];
  private algorithmManager: AlgorithmManager;
  
  constructor(elevators: Elevator[]) {
    this.elevators = elevators;
    this.algorithmManager = new AlgorithmManager();
    
    // Set the reference to this system in each elevator
    this.elevators.forEach(elevator => {
      elevator.setElevatorSystem(this);
    });
  }
  
  /**
   * Set the current algorithm by ID
   */
  public setAlgorithm(algorithmId: string): boolean {
    return this.algorithmManager.setCurrentAlgorithm(algorithmId);
  }
  
  /**
   * Get the current algorithm manager
   */
  public getAlgorithmManager(): AlgorithmManager {
    return this.algorithmManager;
  }

  /**
   * Find the best elevator to serve a specific person using the current algorithm
   */
  public assignElevatorToPerson(
    person: Person, 
    startFloor: number, 
    floorStats?: FloorStats[]
  ): number {
    const building = this.getBuildingData(floorStats);
    
    // Convert person to PersonData
    const personData: PersonData = {
      startFloor: person.startFloor,
      destinationFloor: person.destinationFloor,
      waitTime: person.waitTime
    };
    
    // Delegate to the current algorithm
    return this.algorithmManager.getCurrentAlgorithm().assignElevatorToPerson(
      personData, 
      startFloor, 
      building
    );
  }
  
  /**
   * Decide which floor an elevator should visit next using the current algorithm
   */
  public decideNextFloor(elevator: Elevator): number {
    const elevatorData = this.convertElevatorToData(elevator);
    const building = this.getBuildingData();
    
    // Delegate to the current algorithm
    return this.algorithmManager.getCurrentAlgorithm().decideNextFloor(
      elevatorData,
      building
    );
  }
  
  /**
   * Convert an Elevator to ElevatorData for the algorithms
   */
  private convertElevatorToData(elevator: Elevator): ElevatorData {
    return {
      id: elevator.id,
      currentFloor: elevator.currentFloor,
      targetFloor: elevator.currentDestination >= 0 ? elevator.currentDestination : null,
      state: elevator.currentState,
      direction: elevator.currentDirection,
      passengers: elevator.numberOfPeople,
      capacity: elevator.capacity,
      floorsToVisit: Array.from(elevator.floorsToVisit),
      passengerDestinations: Array.from(elevator.passengerDestinations),
      isInRepair: elevator.currentState === ElevatorState.REPAIR
    };
  }
  
  /**
   * Build the complete BuildingData object with all information needed by algorithms
   */
  private getBuildingData(providedFloorStats?: FloorStats[]): BuildingData {
    const elevatorData = this.elevators.map(elevator => this.convertElevatorToData(elevator));
    
    return {
      totalFloors: this.getTotalFloors(),
      totalElevators: this.elevators.length,
      elevators: elevatorData,
      floorStats: providedFloorStats || []
    };
  }
  
  /**
   * Get the total number of floors in the building
   */
  private getTotalFloors(): number {
    // Determine total floors from elevator configuration
    let maxFloors = 0;
    this.elevators.forEach(elevator => {
      // Assuming the totalFloors property is accessible
      const elevatorFloors = (elevator as any)._totalFloors || 0;
      if (elevatorFloors > maxFloors) {
        maxFloors = elevatorFloors;
      }
    });
    return maxFloors;
  }
}
