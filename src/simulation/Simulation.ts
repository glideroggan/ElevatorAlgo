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
  private isPaused: boolean = true; // Start in paused state
  private isReady: boolean = false;
  private onReadyCallbacks: Array<() => void> = [];

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

    // Initialize algorithms asynchronously
    this.initAlgorithms().then(() => {
      // Signal that initialization is complete
      this.isReady = true;
      console.debug('Simulation fully initialized, algorithms loaded');
      
      // Call any registered ready callbacks
      this.onReadyCallbacks.forEach(callback => callback());
      this.onReadyCallbacks = []; // Clear the callbacks after calling them
    });

    // Listen for stats updates from Building
    this.building.onStatsUpdated((stats) => {
      // When stats are updated (every 100 people), save to localStorage
      this.saveCurrentStats(stats);
      console.debug('Stats updated and saved:', stats);
    });
  }

  /**
   * Initialize algorithms asynchronously
   */
  private async initAlgorithms(): Promise<void> {
    try {
      // Get the algorithm manager
      const algorithmManager = this.building.getElevatorSystem().getAlgorithmManager();
      
      // Register algorithms
      const algorithms = await reg();
      algorithms.forEach((algo: BaseElevatorAlgorithm) => {
        algorithmManager.registerAlgorithm(algo);
      });
      
      // Debug: Check all registered algorithms
      algorithmManager.debugAlgorithms();
    } catch (error) {
      console.error('Error initializing algorithms:', error);
    }
  }

  /**
   * Register a callback to be called when the simulation is fully initialized
   */
  public onReady(callback: () => void): void {
    if (this.isReady) {
      // If already ready, call immediately
      callback();
    } else {
      // Otherwise add to queue
      this.onReadyCallbacks.push(callback);
    }
  }

  /**
   * Check if simulation is fully initialized
   */
  public checkIfReady(): boolean {
    return this.isReady;
  }

  public update(): void {
    // Skip update if paused
    if (this.isPaused) return;

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

  public async reset(settings: SimulationSettings): Promise<void> {
    this.settings = settings;

    // Save current algorithm ID before resetting
    const previousAlgoId = this.currentAlgorithmId;

    // Reset seed if specified or keep the same seed for reproducibility
    this.simulationSeed = settings.seed || this.simulationSeed;
    this.rng = new SeededRandom(this.simulationSeed);
    console.debug(`Simulation reset with seed: ${this.simulationSeed}`);

    // Create new building with reset RNG
    this.building = new Building(this.p, settings, this.rng);

    // Update the global reference
    (window as any).simulationBuilding = this.building;

    this.frameCounter = 0;
    this.peopleSpawnRate = 60 / settings.peopleFlowRate;

    // Reconnect the stats update callback after resetting
    this.building.onStatsUpdated((stats) => {
      this.saveCurrentStats(stats);
      console.debug('Stats updated and saved:', stats);
    });

    // Re-register algorithms with the new building's elevator system
    const algorithmManager = this.building.getElevatorSystem().getAlgorithmManager();

    // Register built-in and custom algorithms from register.ts
    const algorithms = await reg();
    algorithms.forEach((algo: BaseElevatorAlgorithm) => {
      algorithmManager.registerAlgorithm(algo);
    });

    // If there was a custom algorithm in the previous building, re-register it
    const prevBuildingAlgoManager = (window as any).prevAlgorithmManager;
    if (prevBuildingAlgoManager && prevBuildingAlgoManager.getAlgorithmById('custom')) {
      const customAlgo = prevBuildingAlgoManager.getAlgorithmById('custom');
      algorithmManager.registerAlgorithm(customAlgo);
    }

    // Store current algorithm manager for future resets
    (window as any).prevAlgorithmManager = algorithmManager;

    // Debug: Check all registered algorithms
    algorithmManager.debugAlgorithms();

    // Re-apply algorithm selection
    if (previousAlgoId) {
      const success = this.building.getElevatorSystem().setAlgorithm(previousAlgoId);
      if (success) {
        this.currentAlgorithmId = previousAlgoId;
        console.debug(`Re-applied algorithm: ${previousAlgoId}`);
      } else {
        console.warn(`Failed to re-apply algorithm: ${previousAlgoId}`);
      }
    }

    // Set ready state after reset is complete
    this.isReady = true;
    
    // Notify any callbacks registered after reset
    this.onReadyCallbacks.forEach(callback => callback());
    this.onReadyCallbacks = [];
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
    console.debug(`Switching algorithm to: ${algorithmId}`);
    const success = this.building.getElevatorSystem().setAlgorithm(algorithmId);
    if (success) {
      this.currentAlgorithmId = algorithmId;
      console.debug(`Algorithm switched to: ${algorithmId}`);

      // Debug check if the algorithm was actually switched
      const currentAlgoName = this.building.getElevatorSystem().getAlgorithmManager().getCurrentAlgorithm().name;
      console.debug(`Current algorithm is now: ${currentAlgoName}`);

      // Reset the stat counters in Building to trigger a new stats collection cycle
      const buildingAny = this.building as any;
      if (buildingAny.lastStatsUpdateCount !== undefined) {
        buildingAny.lastStatsUpdateCount = 0;
      }
    } else {
      console.error(`Failed to switch to algorithm: ${algorithmId}`);
    }
    return success;
  }

  /**
   * Get a list of available algorithms
   */
  public getAvailableAlgorithms(): Array<{ id: string, name: string, description: string }> {
    const manager = this.building.getElevatorSystem().getAlgorithmManager();
    return manager.getAlgorithms().map(({ id, algorithm }) => ({
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

  // Add pause/play methods
  public pause(): void {
    this.isPaused = true;
    console.debug('Simulation paused');
  }

  public play(): void {
    this.isPaused = false;
    console.debug('Simulation resumed');
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    console.debug(`Simulation ${this.isPaused ? 'paused' : 'resumed'}`);
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }
}
