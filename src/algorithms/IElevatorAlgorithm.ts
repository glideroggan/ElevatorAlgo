import { ElevatorState } from '../models/Elevator';

// Data types to expose clean data to algorithms without internal references
export interface ElevatorData {
  /**
   * Unique elevator identifier (0-based index)
   */
  id: number;
  
  /**
   * Current floor where the elevator is located
   */
  currentFloor: number;
  
  /**
   * Target floor the elevator is moving toward, or null if idle
   */
  targetFloor: number | null;
  
  /**
   * Current operational state
   * - IDLE (0): Not moving and no immediate tasks
   * - MOVING_UP (1): Moving upward
   * - MOVING_DOWN (2): Moving downward
   * - LOADING (3): Stopped at a floor for loading/unloading
   * - REPAIR (4): Out of service for maintenance
   */
  state: ElevatorState;
  
  /**
   * Current movement direction
   * 1: Going up
   * -1: Going down
   * 0: Not moving
   */
  direction: number;
  
  /**
   * Current number of passengers
   */
  passengers: number;
  
  /**
   * Maximum passenger capacity
   */
  capacity: number;
  
  /**
   * All floors the elevator needs to visit (pickups and dropoffs)
   */
  floorsToVisit: number[];
  
  /**
   * Floors where current passengers want to go
   */
  passengerDestinations: number[];
  
  /**
   * Whether the elevator is currently in repair mode
   */
  isInRepair: boolean;
}

export interface PersonData {
  startFloor: number;
  destinationFloor: number;
  waitTime: number;
}

export interface FloorStats {
  floor: number;
  waitingCount: number;
  maxWaitTime: number;
  avgWaitTime: number;
  waitingPeople: PersonData[];
}

export interface BuildingData {
  totalFloors: number;
  totalElevators: number;
  elevators: ElevatorData[];
  floorStats: FloorStats[];
}

/**
 * Interface for elevator algorithms - implement this to create your own algorithm
 */
export interface IElevatorAlgorithm {
  /**
   * Name of the algorithm (for display purposes)
   */
  readonly name: string;
  
  /**
   * Description of how the algorithm works
   */
  readonly description: string;
  
  /**
   * Decide which elevator should be assigned to a person
   * @param person Data about the person requesting an elevator
   * @param startFloor The floor where the person is waiting
   * @param building Current state of the building and all elevators
   * @returns The index of the elevator to assign (0 to totalElevators-1)
   */
  assignElevatorToPerson(
    person: PersonData,
    startFloor: number, 
    building: BuildingData
  ): number;
  
  /**
   * Decide which floor an elevator should visit next
   * @param elevator The elevator that needs to decide its next destination
   * @param building Current state of the building and all elevators
   * @returns The floor number the elevator should visit next
   */
  decideNextFloor(
    elevator: ElevatorData,
    building: BuildingData
  ): number;
  
  /**
   * Optional initialization code when the algorithm is first loaded
   */
  initialize?(building: BuildingData): void;
  
  /**
   * Optional cleanup code when the algorithm is being switched out
   */
  cleanup?(): void;
}
