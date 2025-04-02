import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm";
import { PersonData, BuildingData, ElevatorData } from "../IElevatorAlgorithm";

export class Simple1 extends BaseElevatorAlgorithm {
    name = "simple1";
    description= "";
    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        return 0
    }
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        return elevator.floorsToVisit[0]
    }

}