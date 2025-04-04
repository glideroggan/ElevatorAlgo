import p5 from 'p5';
import { Building } from '../models/Building';
import { SimulationSettings, SimulationStatistics } from '../models/SimulationSettings';
import { StatsTracker, SimulationResult } from '../stats/StatsTracker';
import { BaseElevatorAlgorithm } from '../algorithms/BaseElevatorAlgorithm';
import { reg } from '../algorithms/scripts/register';
import { Elevator, ElevatorState } from '../models/Elevator';
import { SeededRandom } from '../utils/SeededRandom';

export class Simulation {
  private p: p5;
  private building: Building;
  private settings: SimulationSettings;
  private frameCounter: number = 0;
  private peopleSpawnRate: number = 0;
  private currentAlgorithmId: string = 'default';
  private rng: SeededRandom;
  private simulationSeed: number;
  
  constructor(p: p5, settings: SimulationSettings) {
    this.p = p;
    this.settings = settings;
    
    // Initialize with current timestamp or provided seed
    this.simulationSeed = settings.seed || Date.now();
    this.rng = new SeededRandom(this.simulationSeed);
    console.debug(`Simulation initialized with seed: ${this.simulationSeed}`);
    
    // Create building with the RNG
    this.building = new Building(p, settings, this.rng);
    
    // Expose the building reference globally for components that need it
    (window as any).simulationBuilding = this.building;
    
    // Calculate people spawn rate based on settings
    this.peopleSpawnRate = 60 / settings.peopleFlowRate; // frames between spawns

    // Get or create the algorithm manager
    const algorithmManager = this.building.getElevatorSystem().getAlgorithmManager();
    
    // Register the player algorithm
    reg().forEach((algo:BaseElevatorAlgorithm) => {
      algorithmManager.registerAlgorithm(algo);
    })

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
      
      // Use seeded random instead of Math.random
      let randomFloor;
      const edgeCaseTest = this.rng.randomBool(0.2); // 20% chance for edge cases
      
      if (edgeCaseTest) {
        // Use seeded random for edge cases
        randomFloor = this.rng.randomBool(0.5) ? 0 : this.settings.numberOfFloors - 1;
        console.debug(`Testing edge case: person at ${randomFloor === 0 ? 'ground' : 'top'} floor`);
      } else {
        // Use seeded random instead of p5.random
        randomFloor = this.rng.randomInt(0, this.settings.numberOfFloors);
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
    
    // Reset seed if specified or keep the same seed for reproducibility
    this.simulationSeed = settings.seed || this.simulationSeed;
    this.rng = new SeededRandom(this.simulationSeed);
    console.debug(`Simulation reset with seed: ${this.simulationSeed}`);
    
    // Create new building with reset RNG
    this.building = new Building(this.p, settings, this.rng);
    
    this.frameCounter = 0;
    this.peopleSpawnRate = 60 / settings.peopleFlowRate;
    
    // Reconnect the stats update callback after resetting
    this.building.onStatsUpdated((stats) => {
      this.saveCurrentStats(stats);
      console.debug('Stats updated and saved:', stats);
    });

    // Re-register algorithms with the new building's elevator system
    const algorithmManager = this.building.getElevatorSystem().getAlgorithmManager();
    reg().forEach((algo:BaseElevatorAlgorithm) => {
      algorithmManager.registerAlgorithm(algo);
    })
    
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
      efficiencyScore: buildingStats.efficiencyScore,
      averageJourneyTime: buildingStats.averageJourneyTime || 0,
      averageServiceTime: buildingStats.averageServiceTime || 0
    };
    
    return stats;
  }

  public getElevatorStates(): ElevatorState[] {
    const states: ElevatorState[] = [];
    
    // Fix: Access elevator properties properly
    const elevators = this.building.elevators || [];
    elevators.forEach((elevator: Elevator, index: number) => {
      if (elevator) {
        states.push({
          id: index + 1,
          state: elevator.state,
          floor: elevator.currentFloor || 0,
          passengers: elevator.people?.length || 0,
          capacity: elevator.capacity || 0
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

  // Add methods to access the seed
  public getSeed(): number {
    return this.simulationSeed;
  }
  
  public setSeed(seed: number): void {
    this.simulationSeed = seed;
    this.rng.setSeed(seed);
    console.debug(`Simulation seed set to: ${seed}`);
  }
}
