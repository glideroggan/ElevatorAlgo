import { 
  PersonData, 
  BuildingData,
  ElevatorData,
  FloorStats
} from '../IElevatorAlgorithm';
import { BaseElevatorAlgorithm } from '../BaseElevatorAlgorithm';
import { ElevatorState } from '../../models/Elevator';

/**
 * Default elevator algorithm with enhanced wait time prioritization
 */
export class DefaultElevatorAlgorithm extends BaseElevatorAlgorithm {
  readonly name = "Default Algorithm";
  readonly description = "An optimized elevator algorithm that prioritizes reducing wait times, especially for passengers waiting longer than 20 seconds.";
  
  // Wait time threshold in seconds - above this value, wait time becomes a high priority
  private readonly LONG_WAIT_THRESHOLD = 20;
  
  assignElevatorToPerson(
    person: PersonData,
    startFloor: number, 
    building: BuildingData
  ): number {
    const destFloor = person.destinationFloor;
    let bestElevatorIndex = 0;
    let bestScore = -Infinity;
    
    building.elevators.forEach((elevator, index) => {
      // Don't consider full elevators or elevators in repair
      if (elevator.passengers >= elevator.capacity || elevator.isInRepair) {
        return;
      }
      
      // Calculate a score for this elevator
      const score = this.calculateElevatorScore(elevator, startFloor, destFloor, building.floorStats);
      
      if (score > bestScore) {
        bestScore = score;
        bestElevatorIndex = index;
      }
    });
    
    return bestElevatorIndex;
  }
  
  decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
    const floorsToVisit = new Set(elevator.floorsToVisit);
    
    if (floorsToVisit.size === 0) {
      return elevator.currentFloor;
    }
    
    const currentFloor = elevator.currentFloor;
    const passengerDestinations = new Set(elevator.passengerDestinations);
    
    // Check for floors with long waiting passengers as a high priority
    const urgentFloor = this.checkForUrgentFloors(Array.from(floorsToVisit), building.floorStats);
    if (urgentFloor !== null) {
      console.debug(`Prioritizing floor ${urgentFloor} due to long wait time`);
      return urgentFloor;
    }
    
    // Skip pickup-only floors when elevator is full
    let filteredFloorsToVisit = floorsToVisit;
    
    // Check if elevator is at capacity
    if (elevator.passengers >= elevator.capacity) {
      // Only consider floors where passengers want to get off
      filteredFloorsToVisit = new Set(
        Array.from(floorsToVisit).filter(floor => passengerDestinations.has(floor))
      );
      
      // If we filtered out all floors but we have passengers, something's wrong - use their destinations
      if (filteredFloorsToVisit.size === 0 && passengerDestinations.size > 0) {
        filteredFloorsToVisit = passengerDestinations;
      }
    }
    
    return this.decideUsingRouteOptimizationStrategy(
      elevator, currentFloor, filteredFloorsToVisit, passengerDestinations);
  }
  
  /**
   * Check if any floors have people waiting too long and should be prioritized
   * Returns the floor with the longest wait time above threshold, or null if none
   */
  private checkForUrgentFloors(floors: number[], floorStats: FloorStats[]): number | null {
    let urgentFloor: number | null = null;
    let maxWaitTime = this.LONG_WAIT_THRESHOLD;
    
    // Find floors with people waiting above the threshold
    for (const floor of floors) {
      const floorStat = floorStats.find(stat => stat.floor === floor);
      if (floorStat && floorStat.waitingCount > 0 && floorStat.maxWaitTime > maxWaitTime) {
        urgentFloor = floor;
        maxWaitTime = floorStat.maxWaitTime;
      }
    }
    
    return urgentFloor;
  }
  
  /**
   * Strategy that optimizes the route to minimize total travel distance
   * while considering wait times
   */
  private decideUsingRouteOptimizationStrategy(
    elevator: ElevatorData, 
    currentFloor: number, 
    floorsToVisit: Set<number>, 
    passengerDestinations: Set<number>
  ): number {
    // Get all floors that need to be visited
    const allFloors = Array.from(floorsToVisit);
    
    // If we're already moving in a direction, prioritize floors in that direction first
    if (elevator.direction !== 0) {
      const direction = elevator.direction;
      
      // Find all floors in our current direction of travel
      const floorsInDirection = allFloors.filter(floor => 
        direction > 0 ? floor > currentFloor : floor < currentFloor
      ).sort((a, b) => direction > 0 ? a - b : b - a);
      
      if (floorsInDirection.length > 0) {
        // If we're going up, get the first floor in our path; if going down, get the highest
        const nextFloor = direction > 0 ? 
          Math.min(...floorsInDirection) : // First floor up
          Math.max(...floorsInDirection);  // First floor down
        
        return nextFloor;
      }
      
      // If no floors in current direction, find nearest floor in opposite direction
      const floorsInOppositeDirection = allFloors.filter(floor => 
        direction > 0 ? floor < currentFloor : floor > currentFloor
      );
      
      if (floorsInOppositeDirection.length > 0) {
        // If no more floors in our direction, get the closest floor in the other direction
        return this.findClosestFloor(currentFloor, floorsInOppositeDirection);
      }
    }
    
    // If we're idle or have no directional preference
    
    // First check if we have passengers on board - then prioritize their destinations
    if (passengerDestinations.size > 0) {
      const passengerFloors = allFloors.filter(floor => passengerDestinations.has(floor));
      if (passengerFloors.length > 0) {
        return this.findClosestFloor(currentFloor, passengerFloors);
      }
    }
    
    // Otherwise, go to the closest floor that needs service
    return this.findClosestFloor(currentFloor, allFloors);
  }
  
  /**
   * Calculate a comprehensive score for how suitable an elevator is
   */
  private calculateElevatorScore(
    elevator: ElevatorData, 
    pickupFloor: number, 
    destFloor: number,
    floorStats: FloorStats[]
  ): number {
    // Distance factor - prefer elevators that are closer to pickup
    const distance = this.calculateDistanceToFloor(elevator, pickupFloor);
    const distanceScore = 1000 - (distance * 100); // Closer is better
    
    // Capacity factor - prefer elevators that aren't full
    const capacityFactor = 1 - (elevator.passengers / elevator.capacity);
    const capacityScore = capacityFactor * 500; // Up to 500 points for empty elevators
    
    // Direction factor - prefer elevators already moving in the right direction
    const directionScore = this.getDirectionScore(elevator, pickupFloor);
    
    // Journey efficiency - prefer elevators where pickup is on the way to other destinations
    const journeyScore = this.getJourneyEfficiencyScore(elevator, pickupFloor, destFloor);
    
    // Elevator that will pass by this floor anyway gets a big bonus
    const passbyBonus = this.isFloorInSameDirection(elevator, pickupFloor) ? 800 : 0;
    
    // Idle elevators get a bonus (to distribute work better)
    const idleBonus = elevator.state === ElevatorState.IDLE ? 300 : 0;
    
    // Penalize elevators that already have many stops to make
    const busyPenalty = -elevator.floorsToVisit.length * 50;
    
    // Factor in waiting time - this is now more important with non-linear scaling
    let waitTimeScore = 0;
    const floorStat = floorStats.find(stat => stat.floor === pickupFloor);
    
    if (floorStat && floorStat.waitingCount > 0) {
      // Basic waiting time score
      waitTimeScore = Math.min(floorStat.maxWaitTime * 50, 500);
      
      // Enhanced wait time scoring - apply exponential bonus for long waits
      if (floorStat.maxWaitTime > this.LONG_WAIT_THRESHOLD) {
        // Exponential growth for wait times above threshold
        const excessWaitTime = floorStat.maxWaitTime - this.LONG_WAIT_THRESHOLD;
        const urgencyBonus = Math.min(1000, Math.pow(excessWaitTime, 1.5) * 20);
        waitTimeScore += urgencyBonus;
        
        console.debug(`Floor ${pickupFloor} has ${floorStat.waitingCount} people waiting ${floorStat.maxWaitTime.toFixed(1)}s (urgency bonus: ${urgencyBonus})`);
      }
      
      // Also consider number of waiting people
      waitTimeScore += floorStat.waitingCount * 30;
    }
    
    const totalScore = distanceScore + capacityScore + directionScore + 
                      journeyScore + idleBonus + busyPenalty + passbyBonus + 
                      waitTimeScore;
    
    return totalScore;
  }
  
  private getDirectionScore(elevator: ElevatorData, floor: number): number {
    if (elevator.state === ElevatorState.IDLE) {
      return 0; // No direction preference for idle elevators
    }
    
    // Use helper method from base class
    if (this.isFloorInSameDirection(elevator, floor)) {
      return 400; // Strong preference for elevators already going in the right direction
    }
    
    return -200; // Penalty for elevators going in the wrong direction
  }
  
  private getJourneyEfficiencyScore(elevator: ElevatorData, pickupFloor: number, destFloor: number): number {
    // If elevator is empty, no journey efficiency concerns
    if (elevator.passengers === 0) {
      return 0;
    }
    
    // Check if this pickup/dropoff would be "on the way" for the elevator's current route
    const pickupOnWay = this.isFloorInSameDirection(elevator, pickupFloor);
    const dropoffOnWay = this.isFloorInSameDirection(elevator, destFloor);
    
    if (pickupOnWay && dropoffOnWay) {
      return 500; // Both pickup and destination are on the way - perfect!
    } else if (pickupOnWay || dropoffOnWay) {
      return 250; // At least one endpoint is on the way
    }
    
    return -100; // Both pickup and dropoff would require detours
  }
}
