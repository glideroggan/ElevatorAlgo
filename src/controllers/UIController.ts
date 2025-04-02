import { SimulationSettings } from '../models/SimulationSettings';
import { Simulation } from '../simulation/Simulation';

export class UIController {
  private laneSlider: HTMLInputElement;
  private floorSlider: HTMLInputElement;
  private peopleFlowSlider: HTMLInputElement;
  private elevatorSpeedSlider: HTMLInputElement;
  private elevatorCapacitySlider: HTMLInputElement;
  private resetButton: HTMLButtonElement;

  constructor() {
    this.laneSlider = document.getElementById('lanes') as HTMLInputElement;
    this.floorSlider = document.getElementById('floors') as HTMLInputElement;
    this.peopleFlowSlider = document.getElementById('people-flow') as HTMLInputElement;
    this.elevatorSpeedSlider = document.getElementById('elevator-speed') as HTMLInputElement;
    this.elevatorCapacitySlider = document.getElementById('elevator-capacity') as HTMLInputElement;
    this.resetButton = document.getElementById('reset-simulation') as HTMLButtonElement;
    
    // Update value displays initially
    this.updateValueDisplays();
  }

  public getSimulationSettings(): SimulationSettings {
    return {
      numberOfLanes: parseInt(this.laneSlider.value),
      numberOfFloors: parseInt(this.floorSlider.value),
      peopleFlowRate: parseInt(this.peopleFlowSlider.value),
      elevatorSpeed: parseInt(this.elevatorSpeedSlider.value),
      elevatorCapacity: parseInt(this.elevatorCapacitySlider.value)
    };
  }

  public setupEventListeners(simulation: Simulation): void {
    // Update displays when sliders change
    const sliders = [
      this.laneSlider, 
      this.floorSlider, 
      this.peopleFlowSlider, 
      this.elevatorSpeedSlider, 
      this.elevatorCapacitySlider
    ];
    
    sliders.forEach(slider => {
      slider.addEventListener('input', () => {
        this.updateValueDisplays();
      });
      
      slider.addEventListener('change', () => {
        simulation.updateSettings(this.getSimulationSettings());
      });
    });
    
    // Reset simulation when button is clicked
    this.resetButton.addEventListener('click', () => {
      simulation.reset(this.getSimulationSettings());
    });
  }

  private updateValueDisplays(): void {
    document.getElementById('lanes-value')!.textContent = this.laneSlider.value;
    document.getElementById('floors-value')!.textContent = this.floorSlider.value;
    document.getElementById('people-flow-value')!.textContent = this.peopleFlowSlider.value;
    document.getElementById('elevator-speed-value')!.textContent = this.elevatorSpeedSlider.value;
    document.getElementById('elevator-capacity-value')!.textContent = this.elevatorCapacitySlider.value;
  }

  public updateStats(simulation: Simulation): void {
    // Update basic statistics
    const stats = simulation.getStatistics();
    document.getElementById('avg-wait-time')!.textContent = stats.averageWaitTime.toFixed(1);
    document.getElementById('total-people')!.textContent = stats.totalPeopleServed.toString();
    document.getElementById('efficiency-score')!.textContent = stats.efficiencyScore.toFixed(0);
    
    // Update elevator status table
    this.updateElevatorStatus(simulation);
    
    // Update legend colors
    this.updateLegendColors();
  }
  
  private updateElevatorStatus(simulation: Simulation): void {
    const elevatorStates = simulation.getElevatorStates();
    const tableBody = document.getElementById('elevator-status-body');
    
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add a row for each elevator
    elevatorStates.forEach(elevator => {
      const row = document.createElement('tr');
      
      // Elevator ID
      const idCell = document.createElement('td');
      idCell.textContent = `E${elevator.id}`;
      row.appendChild(idCell);
      
      // State with color
      const stateCell = document.createElement('td');
      stateCell.textContent = elevator.state;
      stateCell.className = `state-${elevator.state.toLowerCase()}`;
      row.appendChild(stateCell);
      
      // Floor
      const floorCell = document.createElement('td');
      floorCell.textContent = elevator.floor.toString();
      row.appendChild(floorCell);
      
      // Capacity
      const capacityCell = document.createElement('td');
      capacityCell.textContent = `${elevator.passengers}/${elevator.capacity}`;
      
      // Add a visual indicator of capacity
      const percentFull = elevator.capacity > 0 ? (elevator.passengers / elevator.capacity) * 100 : 0;
      const capacityBar = document.createElement('div');
      capacityBar.className = 'capacity-bar';
      const fillBar = document.createElement('div');
      fillBar.className = 'capacity-fill';
      fillBar.style.width = `${percentFull}%`;
      
      // Color the fill bar based on how full the elevator is
      if (percentFull < 50) {
        fillBar.style.backgroundColor = 'green';
      } else if (percentFull < 80) {
        fillBar.style.backgroundColor = 'orange';
      } else {
        fillBar.style.backgroundColor = 'red';
      }
      
      capacityBar.appendChild(fillBar);
      capacityCell.appendChild(document.createTextNode(' '));
      capacityCell.appendChild(capacityBar);
      
      row.appendChild(capacityCell);
      
      tableBody.appendChild(row);
    });
  }
  
  private updateLegendColors(): void {
    // Get all the color indicators
    const legendItems = {
      'idle': document.getElementById('legend-idle'),
      'moving-up': document.getElementById('legend-moving-up'),
      'moving-down': document.getElementById('legend-moving-down'),
      'loading': document.getElementById('legend-loading'),
      'repair': document.getElementById('legend-repair')
    };
    
    // Set their background colors
    if (legendItems.idle) legendItems.idle.style.backgroundColor = '#999999';
    if (legendItems['moving-up']) legendItems['moving-up'].style.backgroundColor = '#00FF00';
    if (legendItems['moving-down']) legendItems['moving-down'].style.backgroundColor = '#FF0000';
    if (legendItems.loading) legendItems.loading.style.backgroundColor = '#FFFF00';
    if (legendItems.repair) legendItems.repair.style.backgroundColor = '#800080';
  }
}
