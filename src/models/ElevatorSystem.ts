import { Elevator, ElevatorState } from './Elevator';
import { Person } from './Person';

// Define a type for floor statistics
export interface FloorStats {
  floor: number;
  waitingCount: number;
  maxWaitTime: number;
  avgWaitTime: number;
}

export class ElevatorSystem {
  private elevators: Elevator[];
  private elevatorEfficiencyStrategy: 'dropoff-first' | 'route-optimization' = 'route-optimization';
  
  constructor(elevators: Elevator[]) {
    this.elevators = elevators;
    
    // Set the reference to this system in each elevator
    this.elevators.forEach(elevator => {
      elevator.setElevatorSystem(this);
    });
  }
  
  // Set the efficiency strategy
  public setEfficiencyStrategy(strategy: 'dropoff-first' | 'route-optimization'): void {
    this.elevatorEfficiencyStrategy = strategy;
    console.log(`Elevator system using ${strategy} strategy`);
  }

  /**
   * Find the best elevator to serve a specific person
   * @param person The person to be served
   * @param startFloor The floor the person is on
   * @param floorStats Statistics about all floors
   * @returns The index of the assigned elevator
   */
  public assignElevatorToPerson(
    person: Person, 
    startFloor: number, 
    floorStats?: FloorStats[]
  ): number {
    const destFloor = person.destinationFloor;
    let bestElevatorIndex = 0;
    let bestScore = -Infinity;
    
    this.elevators.forEach((elevator, index) => {
      // Don't consider full elevators
      if (elevator.NumberOfPeople >= elevator.Capacity) {
        return;
      }
      
      // Calculate a score for this elevator with enhanced criteria
      const score = this.calculateElevatorScore(elevator, startFloor, destFloor, floorStats);
      
      if (score > bestScore) {
        bestScore = score;
        bestElevatorIndex = index;
      }
    });
    
    return bestElevatorIndex;
  }
  
  /**
   * Central decision-making logic for which floor an elevator should visit next
   */
  public decideNextFloor(elevator: Elevator): number {
    const floorsToVisit = elevator.floorsToVisit;
    
    if (floorsToVisit.size === 0) {
      return elevator.getCurrentFloor();
    }
    
    // Get current state of this elevator
    const currentFloor = elevator.getCurrentFloor();
    const currentState = elevator.getState();
    const passengerDestinations = elevator.passengerDestinations;
    
    // Different strategies for deciding next floor
    switch (this.elevatorEfficiencyStrategy) {
      case 'dropoff-first': 
        return this.decideUsingDropoffFirstStrategy(
          elevator, currentFloor, floorsToVisit, passengerDestinations);
        
      case 'route-optimization':
      default:
        return this.decideUsingRouteOptimizationStrategy(
          elevator, currentFloor, currentState, floorsToVisit, passengerDestinations);
    }
  }
  
  /**
   * Strategy that prioritizes dropping off passengers before picking up new ones
   */
  private decideUsingDropoffFirstStrategy(
    elevator: Elevator, 
    currentFloor: number, 
    floorsToVisit: Set<number>, 
    passengerDestinations: Set<number>
  ): number {
    // First prioritize floors with passengers that need to get off
    const destinationsToVisit = Array.from(floorsToVisit)
      .filter(floor => passengerDestinations.has(floor));
    
    if (destinationsToVisit.length > 0) {
      // If we have passenger destinations, go to the closest one
      return this.findClosestFloor(currentFloor, destinationsToVisit);
    }
    
    // If no passenger destinations, go to the closest pickup floor
    return this.findClosestFloor(currentFloor, Array.from(floorsToVisit));
  }
  
  /**
   * Strategy that optimizes the route to minimize total travel distance
   * This can mix pickups and dropoffs for better efficiency
   */
  private decideUsingRouteOptimizationStrategy(
    elevator: Elevator, 
    currentFloor: number, 
    currentState: ElevatorState,
    floorsToVisit: Set<number>, 
    passengerDestinations: Set<number>
  ): number {
    // Get all floors that need to be visited
    const allFloors = Array.from(floorsToVisit);
    
    // If we're already moving in a direction, prioritize floors in that direction first
    if (currentState === ElevatorState.MOVING_UP || currentState === ElevatorState.MOVING_DOWN) {
      const direction = currentState === ElevatorState.MOVING_UP ? 1 : -1;
      
      // Find all floors in our current direction of travel
      const floorsInDirection = allFloors.filter(floor => 
        direction > 0 ? floor > currentFloor : floor < currentFloor
      ).sort((a, b) => direction > 0 ? a - b : b - a);
      
      if (floorsInDirection.length > 0) {
        // If we're going up, get the first floor in our path; if going down, get the highest
        const nextFloor = direction > 0 ? 
          Math.min(...floorsInDirection) : // First floor up
          Math.max(...floorsInDirection);  // First floor down
        
        console.log(`Elevator ${(elevator as any).id + 1} route optimization: going ${direction > 0 ? 'UP' : 'DOWN'} to floor ${nextFloor}`);
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
   * Helper function to find closest floor from a list of floors
   */
  private findClosestFloor(currentFloor: number, floors: number[]): number {
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
   * Calculate a comprehensive score for how suitable an elevator is
   * Higher score = better choice
   */
  private calculateElevatorScore(
    elevator: Elevator, 
    pickupFloor: number, 
    destFloor: number,
    floorStats?: FloorStats[]
  ): number {
    // Distance factor - prefer elevators that are closer to pickup
    const distance = elevator.getDistanceToFloor(pickupFloor);
    const distanceScore = 1000 - (distance * 100); // Closer is better
    
    // Capacity factor - prefer elevators that aren't full
    const capacityFactor = 1 - (elevator.NumberOfPeople / elevator.Capacity);
    const capacityScore = capacityFactor * 500; // Up to 500 points for empty elevators
    
    // Direction factor - prefer elevators already moving in the right direction
    const directionScore = this.getDirectionScore(elevator, pickupFloor);
    
    // Journey efficiency - prefer elevators where pickup is on the way to other destinations
    const journeyScore = this.getJourneyEfficiencyScore(elevator, pickupFloor, destFloor);
    
    // Pass-by bonus - strongly favor elevators that will pass by this floor anyway
    const passbyBonus = this.isFloorOnWay(elevator, pickupFloor) ? 800 : 0;
    
    // Idle elevators get a bonus (to distribute work better)
    const idleBonus = elevator.isIdle ? 300 : 0;
    
    // Penalize elevators that already have many stops to make
    const busyPenalty = -elevator.numberOfStops * 50;
    
    // New: Factor in wait time if we have floor statistics
    let waitTimeScore = 0;
    if (floorStats) {
      const floorStat = floorStats.find(stat => stat.floor === pickupFloor);
      if (floorStat) {
        // Prioritize floors with high max wait time
        waitTimeScore = Math.min(floorStat.maxWaitTime * 100, 1000);
        
        // Also consider number of waiting people
        waitTimeScore += floorStat.waitingCount * 50;
      }
    }
    
    const totalScore = distanceScore + capacityScore + directionScore + 
                      journeyScore + idleBonus + busyPenalty + passbyBonus + 
                      waitTimeScore;
    
    console.debug(`Elevator ${(elevator as any).id + 1} score for floor ${pickupFloor}: ${totalScore.toFixed(0)} 
      (dist: ${distanceScore.toFixed(0)}, cap: ${capacityScore.toFixed(0)}, dir: ${directionScore.toFixed(0)}, 
      journey: ${journeyScore.toFixed(0)}, passBy: ${passbyBonus.toFixed(0)}, wait: ${waitTimeScore.toFixed(0)})`);
    
    return totalScore;
  }
  
  /**
   * Calculate how well the elevator's current direction aligns with serving this floor
   */
  private getDirectionScore(elevator: Elevator, floor: number): number {
    if (elevator.isIdle) {
      return 0; // No direction preference for idle elevators
    }
    
    const currentFloor = elevator.getCurrentFloor();
    const currentDirection = elevator.currentDirection;
    
    // If elevator is going up and the floor is above, or going down and floor is below
    if ((currentDirection > 0 && floor > currentFloor) || 
        (currentDirection < 0 && floor < currentFloor)) {
      return 400; // Strongly prefer elevators already going in the right direction
    }
    
    return -200; // Penalty for elevators going in the wrong direction
  }
  
  /**
   * Calculate efficiency score based on the complete journey
   */
  private getJourneyEfficiencyScore(elevator: Elevator, pickupFloor: number, destFloor: number): number {
    // If elevator is empty, no journey efficiency concerns
    if (elevator.NumberOfPeople === 0) {
      return 0;
    }
    
    // Check if this pickup/dropoff would be "on the way" for the elevator's current route
    const pickupOnWay = this.isFloorOnWay(elevator, pickupFloor);
    const dropoffOnWay = this.isFloorOnWay(elevator, destFloor);
    
    if (pickupOnWay && dropoffOnWay) {
      return 500; // Both pickup and destination are on the way - perfect!
    } else if (pickupOnWay || dropoffOnWay) {
      return 250; // At least one endpoint is on the way
    }
    
    return -100; // Both pickup and dropoff would require detours
  }
  
  /**
   * Check if a floor is "on the way" for the elevator's current journey
   */
  private isFloorOnWay(elevator: Elevator, floor: number): boolean {
    if (elevator.isIdle) return true; // Any floor is "on the way" for an idle elevator
    
    const currentFloor = elevator.getCurrentFloor();
    const direction = elevator.currentDirection;
    const currentDestination = elevator.currentDestination;
    
    if (direction > 0) { // Going up
      return floor >= currentFloor && floor <= currentDestination;
    } else { // Going down
      return floor <= currentFloor && floor >= currentDestination;
    }
  }
}
