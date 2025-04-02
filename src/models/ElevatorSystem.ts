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
   * Assign an elevator to a person using the current algorithm
   */
  public assignElevatorToPerson(
    person: Person, 
    startFloor: number, 
    floorStats?: FloorStats[]
  ): number {
    const building = this.getBuildingData(floorStats);
    
    // Convert person to PersonData
    const personData: PersonData = {
      startFloor: person.StartFloor,
      destinationFloor: person.DestinationFloor,
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
  public decideNextFloor(elevator: Elevator, floorStats?: FloorStats[]): number {
    const elevatorData = this.convertElevatorToData(elevator);
    
    // Always try to get fresh floor stats if not provided
    if (!floorStats || floorStats.length === 0) {
      const buildingRef = (window as any).simulationBuilding;
      if (buildingRef && typeof buildingRef.getFloorStats === 'function') {
        floorStats = buildingRef.getFloorStats();
      }
    }
    
    const building = this.getBuildingData(floorStats);
    
    try {
      // Log some debug info about what's being decided
      // if (floorStats && floorStats.some(s => s.waitingCount > 0)) {
      //   console.debug(`Deciding next floor for elevator ${elevator.id + 1} with floorStats:`, 
      //     floorStats.filter(s => s.waitingCount > 0).map(s => 
      //       `Floor ${s.floor}: ${s.waitingCount} people, max wait: ${s.maxWaitTime.toFixed(1)}s`
      //     )
      //   );
      // }
      
      // Delegate to the current algorithm
      const nextFloor = this.algorithmManager.getCurrentAlgorithm().decideNextFloor(
        elevatorData,
        building
      );
      
      // Validate the returned floor
      if (typeof nextFloor === 'number' && !isNaN(nextFloor) && nextFloor >= 0 && nextFloor < building.totalFloors) {
        return nextFloor;
      } else {
        console.warn(`Algorithm returned invalid floor: ${nextFloor}, using current floor instead`);
        return elevator.currentFloor;
      }
    } catch (error) {
      console.error("Error deciding next floor:", error);
      return elevator.currentFloor; // Safe fallback
    }
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
