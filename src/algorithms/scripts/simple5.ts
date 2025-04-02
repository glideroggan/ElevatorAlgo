import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class Simple5 extends BaseElevatorAlgorithm {
    readonly name = "Simple5";
    readonly description = "extend version of simple4, use wieghts to prioritize elevators based on their current load and waiting time";

    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        // Calculate a score for each elevator based on:
        // 1. Current load (lower is better)
        // 2. Distance to the person (closer is better)
        // 3. Direction alignment (if elevator is already moving toward the person)
        const elevatorScores = building.elevators.map((elevator, index) => {
            const loadFactor = elevator.passengers / elevator.capacity;
            const distance = Math.abs(elevator.currentFloor - startFloor);
            const directionMatch = (startFloor > elevator.currentFloor && elevator.direction === 1) || 
                      (startFloor < elevator.currentFloor && elevator.direction === -1);
            
            // Lower score is better - penalize full elevators heavily
            let score = loadFactor * 10 + distance;
            
            // Give bonus for elevators already moving toward the person
            if (directionMatch) {
                score -= 2;
            }
            
            // Empty elevators get priority
            if (elevator.passengers === 0) {
                score -= 3;
            }
            
            return { index, score };
        });
        
        // Sort by score (lowest first) and choose the best one
        const sortedElevators = [...elevatorScores].sort((a, b) => a.score - b.score);
        return sortedElevators[0].index;
    }
    
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        if (elevator.floorsToVisit.length === 0) {
            return elevator.currentFloor; // No floors to visit, stay where you are
        }

        // Define weights for different factors - adjust these for tuning
        const WEIGHTS = {
            WAITING_TIME: 2.0,     // Weight for time people have been waiting
            PASSENGER_COUNT: 1.5,  // Weight for number of people waiting
            DROPOFF_PRIORITY: 3.0, // Priority for dropping off current passengers
            DIRECTION_MATCH: 1.0,  // Bonus for floors in the same direction
            DISTANCE_PENALTY: 0.5,  // Penalty for distance from current floor
            CAPACITY_PENALTY: 5.0 // Penalty for being at capacity
        };

        // Calculate scores for each floor
        const floorScores = elevator.floorsToVisit.map(floor => {
            let score = 0;
            const floorStat = this.getElevatorFloorStats(elevator, building).find(stat => stat.floor === floor);
            const isDropOffFloor = elevator.passengerDestinations.includes(floor);
            const distance = Math.abs(floor - elevator.currentFloor);
            const sameDirection = elevator.direction === 1 ? 
                floor > elevator.currentFloor : 
                floor < elevator.currentFloor;
            // Check if we're at capacity and can't pick up more passengers
            const isFull = elevator.passengers >= elevator.capacity;

            // If we're full, we can only consider pickup floors if we'll drop someone off first
            if (isFull && !isDropOffFloor && floorStat && floorStat.waitingCount > 0) {
                // Heavily penalize picking up more people when already full
                score -= 100;
            }

            // If almost full, slightly reduce score for pickup floors without dropoffs
            if (elevator.passengers > elevator.capacity * 0.8 && !isDropOffFloor && floorStat && floorStat.waitingCount > 0) {
                score -= WEIGHTS.CAPACITY_PENALTY * (elevator.passengers / elevator.capacity);
            }
            // Add score for waiting passengers
            if (floorStat && floorStat .waitingCount > 0) {
                // Prioritize floors with long wait times
                if (floorStat.waitingCount > 0) {
                    score += floorStat.maxWaitTime * WEIGHTS.WAITING_TIME;
                }
                
                // Consider number of waiting people
                score += floorStat.waitingCount * WEIGHTS.PASSENGER_COUNT;
            }
            
            // Prioritize drop-offs to free up space
            if (isDropOffFloor) {
                score += WEIGHTS.DROPOFF_PRIORITY * (elevator.passengers / elevator.capacity);
            }
            
            // Bonus for continuing in same direction
            if (sameDirection) {
                score += WEIGHTS.DIRECTION_MATCH;
            }
            
            // Penalty for distance
            score -= distance * WEIGHTS.DISTANCE_PENALTY;
            
            return { floor, score };
        });

        // Sort by score (highest first)
        const sortedByScore = [...floorScores].sort((a, b) => b.score - a.score);
        console.debug('Floor scores:', sortedByScore.map(f => `Floor ${f.floor}: ${f.score.toFixed(1)}`));

        // Select the highest scoring floor
        if (sortedByScore.length > 0) {
            return sortedByScore[0].floor;
        }
        // Extract wait time information for floors we need to visit, 
        // prioritizing elevator-specific data when available
    
        // If we get here, just visit the first floor in our list
        return elevator.floorsToVisit[0];
    }
}