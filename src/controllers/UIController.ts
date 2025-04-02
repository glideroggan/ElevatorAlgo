import { SimulationSettings } from '../models/SimulationSettings';
import { Simulation } from '../simulation/Simulation';
import { ResultsPanel } from './ResultsPanel';

export class UIController {
  private laneSlider: HTMLInputElement;
  private floorSlider: HTMLInputElement;
  private peopleFlowSlider: HTMLInputElement;
  private elevatorSpeedSlider: HTMLInputElement;
  private elevatorCapacitySlider: HTMLInputElement;
  private resetButton: HTMLButtonElement;
  private algorithmsDropdown: HTMLSelectElement;
  private resultsPanel: ResultsPanel;
  private lastResultsUpdate: number | null = null;

  constructor() {
    this.laneSlider = document.getElementById('lanes') as HTMLInputElement;
    this.floorSlider = document.getElementById('floors') as HTMLInputElement;
    this.peopleFlowSlider = document.getElementById('people-flow') as HTMLInputElement;
    this.elevatorSpeedSlider = document.getElementById('elevator-speed') as HTMLInputElement;
    this.elevatorCapacitySlider = document.getElementById('elevator-capacity') as HTMLInputElement;
    this.resetButton = document.getElementById('reset-simulation') as HTMLButtonElement;
    this.algorithmsDropdown = document.getElementById('algorithm-select') as HTMLSelectElement;

    // Initialize results panel
    this.resultsPanel = new ResultsPanel();

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

    // Set up the algorithms dropdown
    this.populateAlgorithms(simulation);
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
    
    // Show warmup status if active
    if (stats.warmupActive) {
      document.getElementById('efficiency-status')!.textContent = `Warmup: ${stats.warmupTimeLeft.toFixed(1)}s left`;
      document.getElementById('efficiency-status')!.classList.add('warmup');
    } else {
      document.getElementById('efficiency-status')!.textContent = "Measuring";
      document.getElementById('efficiency-status')!.classList.remove('warmup');
    }
    
    document.getElementById('avg-wait-time')!.textContent = stats.averageWaitTime.toFixed(1);
    
    // Add the average service time display
    if (document.getElementById('avg-service-time')) {
      document.getElementById('avg-service-time')!.textContent = stats.averageServiceTime.toFixed(1);
    }
    
    document.getElementById('total-people')!.textContent = stats.totalPeopleServed.toString();
    document.getElementById('people-who-gave-up')!.textContent = stats.peopleWhoGaveUp.toString();
    document.getElementById('efficiency-score')!.textContent = stats.efficiencyScore.toFixed(0);
    
    // Update elevator status table
    this.updateElevatorStatus(simulation);
    
    // Update legend colors
    this.updateLegendColors();

    // Update results table periodically (every 5 seconds)
    const currentTime = Date.now();
    if (!this.lastResultsUpdate || currentTime - this.lastResultsUpdate > 5000) {
      this.resultsPanel.updateResultsTable();
      this.lastResultsUpdate = currentTime;
    }
  }
  
  private updateElevatorStatus(simulation: Simulation): void {
    const elevatorStates = simulation.getElevatorStates();
    const gridContainer = document.getElementById('elevator-status-grid');
    
    if (!gridContainer) return;
    
    // Remove existing elevator rows (but keep the header)
    const existingRows = gridContainer.querySelectorAll('.elevator-grid-row');
    existingRows.forEach(row => row.remove());
    
    // Add a grid row for each elevator
    elevatorStates.forEach(elevator => {
      const row = document.createElement('div');
      row.className = 'elevator-grid-row';
      
      // Elevator ID
      const idCell = document.createElement('div');
      idCell.className = 'id-cell';
      idCell.textContent = `E${elevator.id}`;
      
      // State with color
      const stateCell = document.createElement('div');
      stateCell.className = `state-cell state-${elevator.state.toLowerCase()}`;
      stateCell.textContent = elevator.state;
      
      // Floor
      const floorCell = document.createElement('div');
      floorCell.className = 'floor-cell';
      floorCell.textContent = elevator.floor.toString();
      
      // Capacity
      const capacityCell = document.createElement('div');
      capacityCell.className = 'capacity-cell';
      capacityCell.innerHTML = `${elevator.passengers}/${elevator.capacity}`;
      
      // Calculate percentage full
      const percentFull = elevator.capacity > 0 ? (elevator.passengers / elevator.capacity) * 100 : 0;
      
      // Create capacity bar element
      const capacityBar = document.createElement('div');
      capacityBar.className = 'capacity-bar';
      
      // Create fill bar element
      const fillBar = document.createElement('div');
      fillBar.className = 'capacity-fill';
      fillBar.style.width = `${percentFull}%`;
      
      // Color based on how full
      if (percentFull < 50) {
        fillBar.style.backgroundColor = 'green';
      } else if (percentFull < 80) {
        fillBar.style.backgroundColor = 'orange';
      } else {
        fillBar.style.backgroundColor = 'red';
      }
      
      // Append fill bar to capacity bar
      capacityBar.appendChild(fillBar);
      
      // Append capacity bar to capacity cell
      capacityCell.appendChild(capacityBar);
      
      // Add cells to row
      row.appendChild(idCell);
      row.appendChild(stateCell);
      row.appendChild(floorCell);
      row.appendChild(capacityCell);
      
      gridContainer.appendChild(row);
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

  /**
   * Populate the algorithms dropdown with available options
   */
  public populateAlgorithms(simulation: Simulation): void {
    const algorithms = simulation.getAvailableAlgorithms();
    
    // Clear existing options
    while (this.algorithmsDropdown.options.length > 0) {
      this.algorithmsDropdown.remove(0);
    }
    
    // Add new options
    algorithms.forEach(algo => {
      const option = document.createElement('option');
      option.value = algo.id;
      option.text = algo.name;
      option.title = algo.description;
      this.algorithmsDropdown.add(option);
    });
    
    // Set up change handler
    this.algorithmsDropdown.addEventListener('change', () => {
      const selectedId = this.algorithmsDropdown.value;
      if (selectedId) {
        simulation.switchAlgorithm(selectedId);
        
        // Update the algorithm description
        const selectedAlgo = algorithms.find(a => a.id === selectedId);
        if (selectedAlgo) {
          document.getElementById('algorithm-description')!.textContent = selectedAlgo.description;
          
          // Highlight this algorithm in the results table
          this.resultsPanel.setCurrentAlgorithm(selectedId);
        }
      }
    });
    
    // Trigger the change event to display the initial description
    const event = new Event('change');
    this.algorithmsDropdown.dispatchEvent(event);
  }
}
