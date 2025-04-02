import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class Simple4 extends BaseElevatorAlgorithm {
    readonly name = "Simple4";
    readonly description = "extend version of simple3, tries to minimize waiting time for people waiting on the floor";

    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        // average the load between all elevators
        let current = 0;
        let chosen = 0
        building.elevators.forEach((elevator, index) => {
            if (elevator.passengers == 0) {
                chosen = index
                return
            }
            if (current !== 0 && elevator.passengers < current) {
                chosen = index
                return
            }
            current = elevator.passengers
        })
        return chosen; 
    }
    
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        if (elevator.floorsToVisit.length === 0) {
            return elevator.currentFloor; // No floors to visit, stay where you are
        }

        // Remove current floor from consideration
        const floorsToVisit = elevator.floorsToVisit.filter(floor => 
            floor !== elevator.currentFloor
        );
        
        if (floorsToVisit.length === 0) {
            return elevator.currentFloor; // No more floors to visit after filtering
        }

        // Get only floor statistics relevant to this elevator using our helper
        const elevatorFloorStats = this.getElevatorFloorStats(elevator, building);
        
        // Sort by wait time (longest first)
        const sortedByWaitTime = [...elevatorFloorStats]
            .sort((a, b) => b.maxWaitTime - a.maxWaitTime);
            
        console.debug('Floors with wait times for elevator', elevator.id + 1, 
            sortedByWaitTime
                .filter(f => f.waitingCount > 0)
                .map(f => `Floor ${f.floor}: ${f.maxWaitTime.toFixed(1)}s (${f.waitingCount} people)`));

        // Find floors with people waiting too long (over 3 seconds)
        const longWaitFloors = sortedByWaitTime
            .filter(data => data.maxWaitTime > 3 && data.waitingCount > 0);

        // If there are people waiting over threshold and elevator not full, prioritize them
        if (elevator.passengers < elevator.capacity && longWaitFloors.length > 0) {
            console.debug(`Prioritizing floor ${longWaitFloors[0].floor} with max wait ${longWaitFloors[0].maxWaitTime.toFixed(1)}s`);
            return longWaitFloors[0].floor;
        }

        // Otherwise, prioritize dropoff for current passengers
        const dropOffFloors = elevator.passengerDestinations.filter(floor => 
            floor !== elevator.currentFloor
        );
        
        if (dropOffFloors.length > 0) {
            return dropOffFloors[0]; // Return the first drop-off floor
        }
        
        // If we get here, just visit the first floor in our list
        return floorsToVisit[0];
    }
}