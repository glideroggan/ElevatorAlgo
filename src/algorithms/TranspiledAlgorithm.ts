import { IElevatorAlgorithm, PersonData, BuildingData, ElevatorData } from './IElevatorAlgorithm';
import { BaseElevatorAlgorithm } from './BaseElevatorAlgorithm';

/**
 * Wrapper for transpiled algorithms to ensure safe execution
 * and proper error handling
 */
export class TranspiledAlgorithm implements IElevatorAlgorithm {
  private algorithm: IElevatorAlgorithm;
  
  constructor(algorithm: IElevatorAlgorithm) {
    this.algorithm = algorithm;
  }
  
  get name(): string {
    return this.algorithm.name || 'Custom Algorithm';
  }
  
  get description(): string {
    return this.algorithm.description || 'A custom algorithm created in the editor';
  }
  
  assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
    try {
      console.debug(`Custom algorithm '${this.name}': assigning elevator for person at floor ${startFloor}`);
      const result = this.algorithm.assignElevatorToPerson(person, startFloor, building);
      
      // Validate return value
      if (typeof result !== 'number' || isNaN(result) || result < 0 || result >= building.elevators.length) {
        console.error(`Invalid elevator index returned: ${result}, using 0 instead`);
        return 0;
      }
      
      console.debug(`Custom algorithm assigned elevator: ${result}`);
      return result;
    } catch (error) {
      console.error('Error in custom assignElevatorToPerson:', error);
      // Default to first elevator
      return 0;
    }
  }
  
  decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
    try {
      console.debug(`Custom algorithm '${this.name}': deciding next floor for elevator ${elevator.id}`);
      const result = this.algorithm.decideNextFloor(elevator, building);
      
      // Validate return value
      if (typeof result !== 'number' || isNaN(result) || result < 0 || result >= building.totalFloors) {
        console.error(`Invalid floor returned: ${result}, using current floor instead`);
        return elevator.currentFloor;
      }
      
      console.debug(`Custom algorithm decided next floor: ${result} for elevator ${elevator.id}`);
      return result;
    } catch (error) {
      console.error('Error in custom decideNextFloor:', error);
      // Default to current floor
      return elevator.currentFloor;
    }
  }
}
