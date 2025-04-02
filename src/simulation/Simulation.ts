import p5 from 'p5';
import { Building } from '../models/Building';
import { SimulationSettings, SimulationStatistics } from '../models/SimulationSettings';
import { SimplePlayerAlgorithm } from '../algorithms/SimplePlayerAlgorithm';
import { AlgorithmManager } from '../algorithms/AlgorithmManager'; // Add this import
import { StatsTracker, SimulationResult } from '../stats/StatsTracker';

export class Simulation {
  private p: p5;
  private building: Building;
  private settings: SimulationSettings;
  private frameCounter: number = 0;
  private peopleSpawnRate: number = 0;
  private currentAlgorithmId: string = 'default';
  
  constructor(p: p5, settings: SimulationSettings) {
    this.p = p;
    this.settings = settings;
    this.building = new Building(p, settings);
    
    // Calculate people spawn rate based on settings
    this.peopleSpawnRate = 60 / settings.peopleFlowRate; // frames between spawns

    // Get or create the algorithm manager
    const algorithmManager = this.building.getElevatorSystem().getAlgorithmManager();
    
    // Register the player algorithm
    const playerAlgo = new SimplePlayerAlgorithm();
    algorithmManager.registerAlgorithm('player', playerAlgo);

    // Listen for stats updates from Building
    this.building.onStatsUpdated((stats) => {
      // When stats are updated (every 100 people), save to localStorage
      this.saveCurrentStats(stats);
      console.debug('Stats updated and saved:', stats);
    });
  }
  
  public update(): void {
    this.building.update();
    
    // Spawn new person based on flow rate
    this.frameCounter++;
    if (this.frameCounter >= this.peopleSpawnRate) {
      this.frameCounter = 0;
      
      // Spawn a person at a random floor
      // Add logic to sometimes test edge cases (ground floor and top floor)
      let randomFloor;
      const edgeCaseTest = Math.random() < 0.2; // 20% chance to test edge cases
      
      if (edgeCaseTest) {
        // Pick either ground floor or top floor to test edge cases
        randomFloor = Math.random() < 0.5 ? 0 : this.settings.numberOfFloors - 1;
        console.debug(`Testing edge case: person at ${randomFloor === 0 ? 'ground' : 'top'} floor`);
      } else {
        // Normal random floor selection
        randomFloor = Math.floor(this.p.random(this.settings.numberOfFloors));
      }
      
      this.building.addPerson(randomFloor);
    }
  }
  
  public draw(): void {
    this.building.draw();
    
    // No longer drawing stats on canvas - they will be displayed in HTML
  }
  
  public updateSettings(settings: SimulationSettings): void {
    this.settings = settings;
    this.peopleSpawnRate = 60 / settings.peopleFlowRate;
    // Other settings updates can be done here without fully resetting
  }
  
  public reset(settings: SimulationSettings): void {
    this.settings = settings;
    this.building = new Building(this.p, settings);
    this.frameCounter = 0;
    this.peopleSpawnRate = 60 / settings.peopleFlowRate;
    
    // Reconnect the stats update callback after resetting
    this.building.onStatsUpdated((stats) => {
      this.saveCurrentStats(stats);
      console.debug('Stats updated and saved:', stats);
    });

    // Re-register algorithms with the new building's elevator system
    const algorithmManager = this.building.getElevatorSystem().getAlgorithmManager();
    
    // Re-register player algorithm
    algorithmManager.registerAlgorithm('player', new SimplePlayerAlgorithm());
    
    // Re-apply current algorithm selection
    if (this.currentAlgorithmId) {
      this.building.getElevatorSystem().setAlgorithm(this.currentAlgorithmId);
    }
  }
  
  public getStatistics(): SimulationStatistics {
    // This method is just returning the building's statistics directly
    // but we need to ensure it contains all properties from the interface
    const buildingStats = this.building.getStatistics();
    
    // Create a properly formed SimulationStatistics object
    const stats: SimulationStatistics = {
      warmupActive: buildingStats.warmupActive,
      warmupTimeLeft: buildingStats.warmupTimeLeft,
      averageWaitTime: buildingStats.averageWaitTime,
      totalPeopleServed: buildingStats.totalPeopleServed,
      peopleWhoGaveUp: buildingStats.peopleWhoGaveUp,
      efficiencyScore: buildingStats.efficiencyScore
    };
    
    return stats;
  }

  public getElevatorStates(): { id: number, state: string, floor: number, passengers: number, capacity: number }[] {
    const states: { id: number, state: string, floor: number, passengers: number, capacity: number }[] = [];
    
    // Fix: Access elevator properties properly
    const elevators = (this.building as any).elevators || [];
    elevators.forEach((elevator: any, index: number) => {
      if (elevator) {
        // Get elevator state properly
        const elevator_state = elevator._state; // Access _state directly
        const stateEnum = ["IDLE", "MOVING_UP", "MOVING_DOWN", "LOADING", "REPAIR"];
        const stateName = stateEnum[elevator_state] || 'UNKNOWN';
        
        states.push({
          id: index + 1,
          state: stateName,
          floor: elevator._currentFloor || 0,
          passengers: elevator._people?.length || 0,
          capacity: elevator._capacity || 0
        });
      }
    });
    
    return states;
  }

  /**
   * Save current simulation stats to localStorage
   */
  private saveCurrentStats(stats: any): void {
    // Get current algorithm details
    const manager = this.building.getElevatorSystem().getAlgorithmManager();
    const currentAlgo = manager.getCurrentAlgorithm();
    
    // Create result object with the correct structure
    const result: SimulationResult = {
      timestamp: Date.now(),
      algorithmId: this.currentAlgorithmId,
      algorithmName: currentAlgo.name,
      settings: {
        numberOfLanes: this.settings.numberOfLanes,
        numberOfFloors: this.settings.numberOfFloors,
        peopleFlowRate: this.settings.peopleFlowRate,
        elevatorSpeed: this.settings.elevatorSpeed,
        elevatorCapacity: this.settings.elevatorCapacity
      },
      stats: {
        peopleServed: stats.totalPeopleServed,
        averageWaitTime: stats.averageWaitTime,
        peopleWhoGaveUp: stats.peopleWhoGaveUp,
        efficiencyScore: stats.efficiencyScore
      }
    };
    
    // Save to localStorage
    StatsTracker.saveSimulationResult(result);
    console.debug('Simulation result saved:', result);
  }

  /**
   * Change the algorithm used by the elevator system
   */
  public switchAlgorithm(algorithmId: string): boolean {
    const success = this.building.getElevatorSystem().setAlgorithm(algorithmId);
    if (success) {
      this.currentAlgorithmId = algorithmId;
      console.debug(`Algorithm switched to: ${algorithmId}`);
      
      // Reset the stat counters in Building to trigger a new stats collection cycle
      const buildingAny = this.building as any;
      if (buildingAny.lastStatsUpdateCount !== undefined) {
        buildingAny.lastStatsUpdateCount = 0;
      }
    }
    return success;
  }

  /**
   * Get a list of available algorithms
   */
  public getAvailableAlgorithms(): Array<{id: string, name: string, description: string}> {
    const manager = this.building.getElevatorSystem().getAlgorithmManager();
    return manager.getAlgorithms().map(({id, algorithm}) => ({
      id,
      name: algorithm.name,
      description: algorithm.description
    }));
  }
}
