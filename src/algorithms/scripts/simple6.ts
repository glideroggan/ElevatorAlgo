import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class Simple6 extends BaseElevatorAlgorithm {
    private readonly MAX_WAIT_TIME = 15; // seconds
    readonly name = "Simple6";
    readonly description = "Enhanced algorithm with optimal routing and wait time prioritization";

    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        // Instead of just load balancing, consider multiple factors
        let bestElevatorIndex = 0;
        let bestScore = -Infinity;
        
        building.elevators.forEach((elevator, index) => {
            // Skip elevators that are full or in repair
            if (elevator.passengers >= elevator.capacity || elevator.isInRepair) {
                return;
            }
            
            // Calculate various factors for scoring
            const distance = this.calculateDistanceToFloor(elevator, startFloor);
            const load = elevator.passengers / elevator.capacity;
            const directionalMatch = this.isFloorInSameDirection(elevator, startFloor);
            
            // Create a score combining multiple factors
            let score = 1000 - (distance * 100);  // Distance factor: closer is better
            score += (1 - load) * 500;            // Load factor: less loaded is better
            score += directionalMatch ? 800 : 0;  // Direction bonus: big bonus if already going that way
            score += elevator.state === 'IDLE' ? 300 : 0;  // Idle bonus: prefer idle elevators
            
            if (score > bestScore) {
                bestScore = score;
                bestElevatorIndex = index;
            }
        });
        
        return bestElevatorIndex;
    }
    
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        if (elevator.floorsToVisit.length === 0) {
            return elevator.currentFloor; // No floors to visit
        }

        // Remove current floor from consideration
        const floorsToVisit = elevator.floorsToVisit.filter(floor => 
            floor !== elevator.currentFloor
        );
        
        if (floorsToVisit.length === 0) {
            return elevator.currentFloor;
        }

        // Use the new helper method to get elevator-specific floor stats
        const elevatorFloorStats = this.getElevatorFloorStats(elevator, building);
        
        // Check if elevator is at capacity
        if (elevator.passengers >= elevator.capacity) {
            // If full, just drop people off - prioritize closest dropoff
            const dropOffFloors = elevator.passengerDestinations.filter(floor => 
                floor !== elevator.currentFloor
            );
            
            if (dropOffFloors.length > 0) {
                return this.findClosestFloor(elevator.currentFloor, dropOffFloors);
            }
        }
        
        // Not full - check for people waiting a long time
        const waitingFloorStats = elevatorFloorStats.filter(stat => 
            stat.waitingCount > 0 && stat.isInVisitList
        );
        
        // If we have waiting floors, sort by wait time and prioritize long waits
        if (waitingFloorStats.length > 0) {
            const sortedByWaitTime = [...waitingFloorStats]
                .sort((a, b) => b.maxWaitTime - a.maxWaitTime);
                
            // If someone has been waiting over 20 seconds, prioritize them
            const urgentFloors = sortedByWaitTime.filter(stat => stat.maxWaitTime > this.MAX_WAIT_TIME);
            if (urgentFloors.length > 0) {
                console.debug(`Prioritizing urgent floor ${urgentFloors[0].floor} with ${urgentFloors[0].maxWaitTime.toFixed(1)}s wait time`);
                return urgentFloors[0].floor;
            }
            
            // If we're already moving, use scan algorithm (elevator moves in one direction until no more requests)
            if (elevator.direction !== 0) {
                const direction = elevator.direction;
                const floorsInCurrentDirection = floorsToVisit.filter(floor => 
                    direction > 0 ? floor > elevator.currentFloor : floor < elevator.currentFloor
                );
                
                if (floorsInCurrentDirection.length > 0) {
                    // Continue in current direction to the next floor
                    return direction > 0 
                        ? Math.min(...floorsInCurrentDirection) 
                        : Math.max(...floorsInCurrentDirection);
                }
            }
            
            // Otherwise go to the floor with longest wait time
            return sortedByWaitTime[0].floor;
        }
        
        // If no one is specifically waiting for us, use the scan algorithm for efficiency
        return this.applyScanAlgorithm(elevator, floorsToVisit);
    }
    
    /**
     * Applies the SCAN algorithm (elevator algorithm) for efficient movement
     */
    private applyScanAlgorithm(elevator: ElevatorData, floors: number[]): number {
        // If no direction yet, determine direction based on closest floor
        if (elevator.direction === 0) {
            const closestFloor = this.findClosestFloor(elevator.currentFloor, floors);
            return closestFloor;
        }
        
        // Continue in current direction if possible
        const direction = elevator.direction;
        const floorsInDirection = floors.filter(floor => 
            direction > 0 ? floor > elevator.currentFloor : floor < elevator.currentFloor
        );
        
        if (floorsInDirection.length > 0) {
            // Continue in current direction to the next floor
            return direction > 0 
                ? Math.min(...floorsInDirection) 
                : Math.max(...floorsInDirection);
        } else {
            // No more floors in current direction, change direction
            const floorsInOppositeDirection = floors.filter(floor => 
                direction > 0 ? floor < elevator.currentFloor : floor > elevator.currentFloor
            );
            
            if (floorsInOppositeDirection.length > 0) {
                return direction > 0 
                    ? Math.max(...floorsInOppositeDirection) 
                    : Math.min(...floorsInOppositeDirection);
            }
        }
        
        // Fallback to closest floor if all else fails
        return this.findClosestFloor(elevator.currentFloor, floors);
    }
}