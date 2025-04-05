import { 
  IElevatorAlgorithm, 
  ElevatorData, 
  PersonData, 
  BuildingData} from './IElevatorAlgorithm';

/**
 * Base class for elevator algorithms that provides helpful utility methods
 * Inherit from this class to create your own algorithm with minimal effort
 */
export abstract class BaseElevatorAlgorithm implements IElevatorAlgorithm {
  abstract readonly name: string;
  abstract readonly description: string;
  
  // Abstract methods that must be implemented
  abstract assignElevatorToPerson(
    person: PersonData,
    startFloor: number, 
    building: BuildingData
  ): number;
  
  abstract decideNextFloor(
    elevator: ElevatorData,
    building: BuildingData
  ): number;
  
  // Helper methods
  
  /**
   * Finds the closest floor among the given floors
   */
  protected findClosestFloor(currentFloor: number, floors: number[]): number {
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
  
  /**
   * Calculates the travel distance to a floor considering elevator's current state
   */
  protected calculateDistanceToFloor(elevator: ElevatorData, floor: number): number {
    if (elevator.state === 'IDLE') {
      return Math.abs(elevator.currentFloor - floor);
    } else if (elevator.state === 'MOVING_UP') {
      if (floor >= elevator.currentFloor) {
        return floor - elevator.currentFloor;
      } else {
        return (
          elevator.targetFloor! - elevator.currentFloor +
          (elevator.targetFloor! - floor)
        );
      }
    } else if (elevator.state === 'MOVING_DOWN') {
      if (floor <= elevator.currentFloor) {
        return elevator.currentFloor - floor;
      } else {
        return (
          elevator.currentFloor - elevator.targetFloor! +
          (floor - elevator.targetFloor!)
        );
      }
    }
    return Math.abs(elevator.currentFloor - floor);
  }
  
  /**
   * Checks if a floor is in the same direction as the elevator is currently moving
   * Does NOT check if the floor is part of the elevator's route
   */
  protected isFloorInSameDirection(elevator: ElevatorData, floor: number): boolean {
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

  /**
   * Helper method to extract floor statistics relevant to this specific elevator
   */
  protected getElevatorFloorStats(elevator: ElevatorData, building: BuildingData) {
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

export default BaseElevatorAlgorithm;