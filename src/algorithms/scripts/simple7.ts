import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class Simple7 extends BaseElevatorAlgorithm {
    readonly name = "Simple7";
    readonly description = "Advanced algorithm optimized for efficiency score with multi-factor decision making and dynamic prioritization";
    
    // Critical thresholds for decision making
    private readonly URGENT_WAIT_THRESHOLD = 20;  // seconds before considering a wait "urgent"
    private readonly OPTIMAL_UTILIZATION = 0.7;   // Target 70% elevator utilization
    private readonly MAX_JOURNEY_LENGTH = 10;     // Floors before considering journey "long"
    
    // Scoring weights for different factors
    private readonly WEIGHTS = {
        urgency: 80,     // Weight for urgent waiting people
        distance: 15,    // Weight for travel distance
        direction: 40,   // Weight for directional continuity
        utilization: 30, // Weight for optimal utilization
        journey: 25      // Weight for journey optimization
    };

    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        // Use comprehensive scoring for each elevator
        const scores: {index: number, score: number}[] = [];
        
        building.elevators.forEach((elevator, index) => {
            // Skip elevators that are full or in repair
            if (elevator.passengers >= elevator.capacity || elevator.isInRepair) {
                scores.push({index, score: -Infinity});
                return;
            }
            
            // Calculate base score from distance
            const distance = this.calculateDistanceToFloor(elevator, startFloor);
            let score = 1000 - (distance * this.WEIGHTS.distance);
            
            // Factor in current direction
            if (this.isFloorInSameDirection(elevator, startFloor)) {
                score += this.WEIGHTS.direction * 10;
            } else if (elevator.direction !== 0) {
                // Penalty for opposite direction
                score -= this.WEIGHTS.direction * 5;
            }
            
            // Factor in current utilization - aim for 70% optimal utilization
            const currentUtilization = elevator.passengers / elevator.capacity;
            const utilizationScore = this.WEIGHTS.utilization * 
                (1 - Math.abs(currentUtilization - this.OPTIMAL_UTILIZATION) * 5);
            score += utilizationScore;
            
            // Factor in journey optimization
            if (elevator.passengers > 0) {
                // Check if this pickup is on the way for existing passengers
                const existingJourneys = elevator.passengerDestinations.length;
                const isOnWay = elevator.floorsToVisit.includes(startFloor);
                if (isOnWay) {
                    score += this.WEIGHTS.journey * 5;
                }
                
                // Avoid adding to already long journeys
                if (existingJourneys > this.MAX_JOURNEY_LENGTH) {
                    score -= this.WEIGHTS.journey * existingJourneys;
                }
            } else {
                // Bonus for empty elevators (best utilization)
                score += this.WEIGHTS.utilization * 3;
            }
            
            // Bonus for idle elevators
            if (elevator.state === 'IDLE') {
                score += 200;
            }
            
            scores.push({index, score});
        });
        
        // Return the elevator with the best score
        scores.sort((a, b) => b.score - a.score);
        return scores[0]?.index || 0;
    }
    
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        if (elevator.floorsToVisit.length === 0) {
            return elevator.currentFloor;
        }
        
        // Get floors to visit excluding current floor
        const floorsToVisit = elevator.floorsToVisit.filter(f => 
            f !== elevator.currentFloor
        );
        
        if (floorsToVisit.length === 0) {
            return elevator.currentFloor;
        }
        
        // Get elevator-specific floor stats
        const elevatorFloorStats = this.getElevatorFloorStats(elevator, building);
        
        // THREE HIGHEST PRIORITIES:
        
        // 1. Urgent priority: People who might give up (close to URGENT_WAIT_THRESHOLD)
        const urgentFloors = elevatorFloorStats
            .filter(stat => stat.waitingCount > 0 && 
                    stat.maxWaitTime > this.URGENT_WAIT_THRESHOLD * 0.8)
            .sort((a, b) => b.maxWaitTime - a.maxWaitTime);
        
        if (urgentFloors.length > 0 && elevator.passengers < elevator.capacity) {
            console.debug(`🚨 URGENT: Floor ${urgentFloors[0].floor} with ${urgentFloors[0].maxWaitTime.toFixed(1)}s wait time`);
            return urgentFloors[0].floor;
        }
        
        // 2. Dropoff priority: If elevator is full or nearly full, focus on dropoffs
        const fullThreshold = elevator.capacity * 0.9; // 90% capacity
        if (elevator.passengers >= fullThreshold) {
            const dropoffFloors = elevator.passengerDestinations;
            if (dropoffFloors.length > 0) {
                // Use SCAN algorithm for dropoffs to minimize travel distance
                return this.applyScanAlgorithm(elevator, Array.from(dropoffFloors));
            }
        }
        
        // 3. Regular scoring system for standard operations
        const floorScores = floorsToVisit.map(floor => {
            // Base score starts at 1000
            let score = 1000;
            
            // Distance factor - closer is generally better
            const distance = Math.abs(elevator.currentFloor - floor);
            score -= distance * 20;
            
            // Direction continuity - prefer continuing in same direction
            if (elevator.direction !== 0 && 
                ((elevator.direction > 0 && floor > elevator.currentFloor) ||
                 (elevator.direction < 0 && floor < elevator.currentFloor))) {
                score += 300;
            }
            
            // Check if floor has waiting people assigned to this elevator
            const floorStat = elevatorFloorStats.find(stat => stat.floor === floor);
            if (floorStat && floorStat.waitingCount > 0) {
                // Add waiting time factor - longer waits get priority
                score += Math.min(floorStat.maxWaitTime * 40, 600);
                
                // Add count factor - more people means more efficiency
                score += floorStat.waitingCount * 15;
            }
            
            // Check if this floor is a passenger destination
            if (elevator.passengerDestinations.includes(floor)) {
                score += 400; // Significant bonus for dropoffs
            }
            
            return { floor, score };
        });
        
        // Sort by score and pick the best floor
        floorScores.sort((a, b) => b.score - a.score);
        
        if (floorScores.length > 0) {
            return floorScores[0].floor;
        }
        
        // Fallback to SCAN algorithm if no scored floors
        return this.applyScanAlgorithm(elevator, floorsToVisit);
    }
    
    private applyScanAlgorithm(elevator: ElevatorData, floors: number[]): number {
        if (floors.length === 0) return elevator.currentFloor;
        
        // If idle, choose closest floor
        if (elevator.direction === 0) {
            return this.findClosestFloor(elevator.currentFloor, floors);
        }
        
        // Continue in current direction if possible
        const floorsInDirection = floors.filter(floor => 
            (elevator.direction > 0 && floor > elevator.currentFloor) ||
            (elevator.direction < 0 && floor < elevator.currentFloor)
        );
        
        // If there are floors in the current direction, visit the next one
        if (floorsInDirection.length > 0) {
            return elevator.direction > 0
                ? Math.min(...floorsInDirection) // Next floor up
                : Math.max(...floorsInDirection); // Next floor down
        }
        
        // Otherwise change direction and visit the next floor
        const remainingFloors = floors.filter(f => f !== elevator.currentFloor);
        if (remainingFloors.length > 0) {
            return elevator.direction > 0
                ? Math.max(...remainingFloors) // Highest floor when changing from up to down
                : Math.min(...remainingFloors); // Lowest floor when changing from down to up
        }
        
        return elevator.currentFloor; // Fallback
    }
}