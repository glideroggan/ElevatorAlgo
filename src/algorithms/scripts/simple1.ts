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

        // Create a copy and sort floors in ascending order
        const visits = [...elevator.floorsToVisit].sort((a, b) => a - b);
        
        return visits[0];
        // // Check if the first floor in our sorted list is the current floor
        // if (visits[0] === elevator.currentFloor) {
        //     // If we're already at this floor, pick the next one if available
        //     return visits.length > 1 ? visits[1] : elevator.currentFloor;
        // }
        
        // // Otherwise return the first floor in our sorted list
        // return visits[0];
    }
}