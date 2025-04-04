export interface SimulationSettings {
    numberOfLanes: number;
    numberOfFloors: number;
    peopleFlowRate: number;
    elevatorSpeed: number;
    elevatorCapacity: number;
    seed?: number; // Optional seed for reproducible simulations
}

export interface SimulationStatistics {
    warmupActive: boolean;
    warmupTimeLeft: number;
    totalPeopleServed: number;
    averageWaitTime: number;
    averageJourneyTime: number; // New metric
    averageServiceTime: number; // Total time (wait + journey)
    peopleWhoGaveUp: number;
    efficiencyScore: number;
}
