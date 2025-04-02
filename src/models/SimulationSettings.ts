export interface SimulationSettings {
  numberOfLanes: number;
  numberOfFloors: number;
  peopleFlowRate: number;
  elevatorSpeed: number;
  elevatorCapacity: number;
}

export interface SimulationStatistics {
  averageWaitTime: number;
  totalPeopleServed: number;
  efficiencyScore: number;
}
