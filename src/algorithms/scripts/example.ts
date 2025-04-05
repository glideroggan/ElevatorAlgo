import { BaseElevatorAlgorithm } from "@elevator-base";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

class Example extends BaseElevatorAlgorithm {
    name = "example";
    description= "";
    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        return 0
    }
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        return elevator.floorsToVisit[0]
    }

}