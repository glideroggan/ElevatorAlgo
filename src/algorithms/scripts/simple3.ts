import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class Simple3 extends BaseElevatorAlgorithm {
    readonly name = "Simple3";
    readonly description = "An extension of simple2";

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