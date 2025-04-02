import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm"
import { DefaultElevatorAlgorithm } from "./DefaultElevatorAlgorithm"
import { Simple1 } from "./simple2"
import { Simple3 } from "./simple3"
import { Simple4 } from "./simple4"
import { SimplePlayerAlgorithm } from "./SimplePlayerAlgorithm"

export const reg = ():BaseElevatorAlgorithm[] => {
    return [
        new SimplePlayerAlgorithm,
        new DefaultElevatorAlgorithm,
        new Simple1,
        new Simple3,
        new Simple4
    ]
}