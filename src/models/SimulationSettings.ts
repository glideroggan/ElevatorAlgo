export interface SimulationSettings {
    numberOfLanes: number;
    numberOfFloors: number;
    peopleFlowRate: number;
    elevatorSpeed: number;
    elevatorCapacity: number;
}

export interface SimulationStatistics {
    warmupActive: boolean;
    warmupTimeLeft: number;
    averageWaitTime: number;
    totalPeopleServed: number;
    peopleWhoGaveUp: number; // Add this missing property
    efficiencyScore: number;
}
