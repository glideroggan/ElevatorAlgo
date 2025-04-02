import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class Simple1 extends BaseElevatorAlgorithm {
    readonly name = "Simple1";
    readonly description = "A simple algorithm that visits floors in ascending order";

    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        return 0; // Always assign to elevator 0
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
        
        // Create a copy and sort floors in ascending order
        // const visits = [...floorsToVisit].sort((a, b) => a - b);
        
        // // Return the first floor in our sorted list
        // return visits[0];
    }
}