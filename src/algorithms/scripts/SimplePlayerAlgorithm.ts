import { ElevatorStatusState } from '../../models/Elevator';
import { BaseElevatorAlgorithm } from '../BaseElevatorAlgorithm';
import { BuildingData, ElevatorData, PersonData } from '../IElevatorAlgorithm';

/**
 * A simple example of a player-created algorithm using the base class
 */
export class SimplePlayerAlgorithm extends BaseElevatorAlgorithm {
  readonly name = "Simple Player Algorithm";
  readonly description = "A basic algorithm that assigns elevators based on proximity and decides next floors based on direction.";
  
  assignElevatorToPerson(
    person: PersonData,
    startFloor: number,
    building: BuildingData
  ): number {
    // Find best elevator using our own scoring system
    let bestElevatorIndex = 0;
    let bestScore = Number.MIN_SAFE_INTEGER;
    
    building.elevators.forEach((elevator, index) => {
      // Skip elevators that are full or in repair
      if (elevator.passengers >= elevator.capacity || elevator.isInRepair) {
        return;
      }
      
      // Calculate our own score for this elevator
      const score = this.calculateOurElevatorScore(elevator, startFloor, person.destinationFloor);
      
      if (score > bestScore) {
        bestScore = score;
        bestElevatorIndex = index;
      }
    });
    
    return bestElevatorIndex;
  }
  
  decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
    const floorsToVisit = elevator.floorsToVisit;
    
    if (floorsToVisit.length === 0) {
      return elevator.currentFloor;
    }
    
    // Simple direction-based strategy
    if (elevator.direction !== 0) {
      const direction = elevator.direction;
      const currentFloor = elevator.currentFloor;
      
      // Floors in current direction
      const floorsInDirection = floorsToVisit.filter(f => 
        direction > 0 ? f > currentFloor : f < currentFloor
      );
      
      if (floorsInDirection.length > 0) {
        return direction > 0 ? 
          Math.min(...floorsInDirection) : // Nearest floor above
          Math.max(...floorsInDirection);  // Nearest floor below
      }
    }
    
    // If no directional preference, use helper to find closest floor
    return this.findClosestFloor(elevator.currentFloor, floorsToVisit);
  }
  
  /**
   * Custom scoring logic for selecting an elevator
   * This is the key part that affects algorithm efficiency
   */
  private calculateOurElevatorScore(
    elevator: ElevatorData, 
    pickupFloor: number, 
    destFloor: number
  ): number {
    // Distance factor - prefer elevators that are closer to pickup
    const distance = this.calculateDistanceToFloor(elevator, pickupFloor);
    const distanceScore = 100 - (distance * 10);
    
    // Capacity factor - prefer emptier elevators
    const capacityFactor = 1 - (elevator.passengers / elevator.capacity);
    const capacityScore = capacityFactor * 50;
    
    // Direction factor - prefer elevators already going in the right direction
    let directionScore = 0;
    if (elevator.state !== 'IDLE') {
      // Check if pickup is in same direction
      const pickupInSameDirection = this.isFloorInSameDirection(elevator, pickupFloor);
      directionScore = pickupInSameDirection ? 30 : -20;
    }
    
    // Idle elevator bonus - to distribute work
    const idleBonus = elevator.state === 'IDLE' ? 20 : 0;
    
    // Penalize elevators that already have many stops
    const busyPenalty = -elevator.floorsToVisit.length * 5;
    
    return distanceScore + capacityScore + directionScore + idleBonus + busyPenalty;
  }
}
