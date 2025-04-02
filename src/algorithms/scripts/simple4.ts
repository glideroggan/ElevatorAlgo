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

        // prioritze people that have waited the longest
        // console.debug(building.floorStats)
        const waitingPeopleOnFloors = building.floorStats.map(floor => {
            return {
                floor: floor.floor,
                waitingTime: floor.maxWaitTime,
                peopleWaiting: floor.waitingCount
            }})
            // console.debug(waitingPeopleOnFloors)
        .sort((a, b) => {
            if (a.waitingTime === b.waitingTime) {
                return 0;
            }
            return b.waitingTime - a.waitingTime;
        });
        console.debug(waitingPeopleOnFloors)
        // if not full, go for the first floor with people waiting over 3 seconds
        const waitingFloors = waitingPeopleOnFloors.filter(floor => 
            floor.waitingTime > 3 
        ).map(floor => floor.floor);
        console.debug(waitingFloors)
        if (elevator.passengers < elevator.capacity && waitingFloors.length > 0) {
            return waitingFloors[0]; // Return the first waiting floor
        }
        
        // If no floors left to visit after filtering, return current floor
        if (floorsToVisit.length === 0) {
            return elevator.currentFloor;
        }

        // priritize drop off passengers first
        const dropOffFloors = elevator.passengerDestinations.filter(floor => 
            floor !== elevator.currentFloor
        );
        if (dropOffFloors.length > 0) {
            return dropOffFloors[0]; // Return the first drop-off floor
        }
        // otwerwise, sort the remaining floors in ascending order and return the first one
        return floorsToVisit[0]
    }
}