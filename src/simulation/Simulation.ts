import p5 from 'p5';
import { Building } from '../models/Building';
import { SimulationSettings, SimulationStatistics } from '../models/SimulationSettings';

export class Simulation {
  private p: p5;
  private building: Building;
  private settings: SimulationSettings;
  private frameCounter: number = 0;
  private peopleSpawnRate: number = 0;
  
  constructor(p: p5, settings: SimulationSettings) {
    this.p = p;
    this.settings = settings;
    this.building = new Building(p, settings);
    
    // Calculate people spawn rate based on settings
    this.peopleSpawnRate = 60 / settings.peopleFlowRate; // frames between spawns
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
        console.log(`Testing edge case: person at ${randomFloor === 0 ? 'ground' : 'top'} floor`);
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
  }
  
  public getStatistics(): SimulationStatistics {
    return this.building.getStatistics();
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
}
