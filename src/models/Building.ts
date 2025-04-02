import p5 from 'p5';
import { SimulationSettings } from './SimulationSettings';
import { Elevator, ElevatorState } from './Elevator';
import { Person } from './Person';
import { ElevatorSystem } from './ElevatorSystem';
import { FloorStats } from '../algorithms/IElevatorAlgorithm'; // Add this import

export class Building {
  private p: p5;
  private floors: number;
  private lanes: number;
  private elevators: Elevator[];
  private elevatorSystem: ElevatorSystem;
  private waitingPeople: Person[][] = [];
  private servedPeople: Person[] = [];
  private floorHeight: number;
  private laneWidth: number;
  private floorButtonPressed: boolean[] = [];
  private floorButtonPressTime: number[] = [];
  private debug: boolean = false; // Enable for detailed debugging

  // Add these new properties for better efficiency scoring
  private warmupPhase: boolean = true;
  private warmupPeriod: number = 30; // seconds
  private warmupStartTime: number = 0;
  private peopleServedAfterWarmup: Person[] = [];
  private peopleServedDuringWarmup: Person[] = [];
  private stairsUsedCount: number = 0; // Count people who gave up

  // Add tracking for stats updates
  private lastStatsUpdateCount: number = 0;
  private statsUpdateInterval: number = 50; // Update stats every 50 people
  private onStatsUpdatedCallback: ((stats: any) => void) | null = null;

  // Add this property for efficiency calculation throttling
  private lastEfficiencyCalculation: number = 0;
  private cachedStatistics: any = null;
  private readonly EFFICIENCY_CALC_INTERVAL = 1000; // 1 second between calculations

  constructor(p: p5, settings: SimulationSettings) {
    this.p = p;
    this.floors = settings.numberOfFloors;
    this.lanes = settings.numberOfLanes;
    this.elevators = [];
    
    // Calculate floor height and lane width based on canvas size and settings
    this.floorHeight = (p.height * 0.9) / (this.floors - 1);
    this.laneWidth = p.width / (this.lanes + 1);
    
    // Initialize elevators
    for (let i = 0; i < this.lanes; i++) {
      this.elevators.push(new Elevator(
        p,
        i,
        this.laneWidth * (i + 1),
        settings.elevatorCapacity,
        settings.elevatorSpeed,
        this.floors,
        this.floorHeight
      ));
    }
    
    // Initialize the central elevator system with enhanced route optimization
    this.elevatorSystem = new ElevatorSystem(this.elevators);
    // this.elevatorSystem.setEfficiencyStrategy('route-optimization');
    
    // Initialize arrays for each floor
    for (let i = 0; i < this.floors; i++) {
      this.waitingPeople[i] = [];
      this.floorButtonPressed[i] = false;
      this.floorButtonPressTime[i] = 0;
    }

    this.warmupStartTime = p.millis();
  }

  public update(): void {
    // Check if we should end warmup phase
    if (this.warmupPhase && (this.p.millis() - this.warmupStartTime) > this.warmupPeriod * 1000) {
      console.debug("Warmup phase complete. Starting to measure actual efficiency.");
      this.warmupPhase = false;
    }
    
    // Update elevators
    this.elevators.forEach((elevator, elevatorIndex) => {
      elevator.update();
      
      // Check if elevator arrived at a floor and is in loading state
      const currentFloor = elevator.getCurrentFloor();
      if (elevator.isAtFloor()) {
        // Load people who are waiting for this specific elevator
        this.loadPeopleToElevator(elevatorIndex, currentFloor);
      }

      // Reassign people from elevators in repair
      if ((elevator as any).state === ElevatorState.REPAIR) {
        this.reassignPeopleFromBrokenElevator(elevatorIndex, currentFloor);
      }
    });
    
    // Update waiting people on floors
    for (let floor = 0; floor < this.floors; floor++) {
      const peopleToRemove: number[] = []; // Track people who've given up
      
      this.waitingPeople[floor].forEach((person, index) => {
        person.updateWaitingTime();
        
        // Check if anyone has given up and left
        if (person.hasGivenUp) {
          peopleToRemove.push(index);
        }
      });
      
      // Remove people who've given up (from highest index to lowest to avoid shifting issues)
      for (let i = peopleToRemove.length - 1; i >= 0; i--) {
        const index = peopleToRemove[i];
        // Add to the count of people who took stairs
        this.stairsUsedCount++;
        this.waitingPeople[floor].splice(index, 1);
      }
      
      // Turn off button if no one is waiting
      if (this.waitingPeople[floor].length === 0) {
        this.floorButtonPressed[floor] = false;
      }
    }

    // Print current elevator states for debugging
    if (this.debug) {
      this.elevators.forEach((elevator, i) => {
        const state = ElevatorState[(elevator as any).state];
        const floor = elevator.getCurrentFloor();
        const floorsToVisit = Array.from((elevator as any).floorsToVisit).join(',');
        console.debug(`Elevator ${i+1}: Floor ${floor}, State: ${state}, To visit: [${floorsToVisit}]`);
      });
    }
  }

  public draw(): void {
    // Draw floors with more detailed information
    for (let i = 0; i < this.floors; i++) {
      const y = this.p.height - (i * this.floorHeight);
      this.p.stroke(120);
      this.p.line(0, y, this.p.width, y);
      
      // Draw floor labels with waiting count - moved further right to prevent clipping
      this.p.noStroke();
      this.p.fill(0);
      const waitingCount = this.waitingPeople[i].length;
      this.p.text(`Floor ${i} (${waitingCount})`, 20, y - 5); // Increased from 10 to 20
      
      // Draw floor buttons with appropriate colors
      const buttonX = this.p.width - 30;
      const buttonY = y - 15;
      
      if (this.floorButtonPressed[i]) {
        this.p.fill(255, 0, 0); // Red if pressed
        
        // Show longest wait time instead of time since button press
        const longestWait = this.getLongestWaitTimeOnFloor(i);
        if (longestWait > 0) {
          this.p.text(`Max wait: ${longestWait.toFixed(1)}s`, buttonX - 70, buttonY + 5);
        } else {
          // Fall back to button press time if no one is waiting
          const waitTime = (this.p.millis() - this.floorButtonPressTime[i]) / 1000;
          this.p.text(`${waitTime.toFixed(1)}s`, buttonX - 40, buttonY + 5);
        }
      } else {
        this.p.fill(0, 255, 0); // Green if not pressed
      }
      
      this.p.ellipse(buttonX, buttonY, 10, 10);
    }
    
    // Draw elevators
    this.elevators.forEach(elevator => {
      elevator.draw();
    });
    
    // Draw waiting people - position them next to their assigned elevator lane
    for (let floor = 0; floor < this.floors; floor++) {
      const y = this.p.height - (floor * this.floorHeight);
      
      // Group people by assigned elevator
      const groupedByElevator = new Map<number, Person[]>();
      this.waitingPeople[floor].forEach(person => {
        const elevator = person.getAssignedElevator();
        if (!groupedByElevator.has(elevator)) {
          groupedByElevator.set(elevator, []);
        }
        groupedByElevator.get(elevator)!.push(person);
      });
      
      // Draw people next to their assigned elevator lane
      groupedByElevator.forEach((people, elevatorId) => {
        if (elevatorId >= 0 && elevatorId < this.elevators.length) {
          // Get the x-coordinate of the assigned elevator
          const elevatorX = this.elevators[elevatorId].xPosition; // Use getter instead
          
          // Draw queue label if more than one person
          if (people.length > 1) {
            this.p.fill(0);
            this.p.textSize(10);
            this.p.text(`${people.length}`, elevatorX - 40, y - 5);
          }
          
          // Calculate waiting area position relative to elevator
          const waitingAreaX = elevatorX - 40; // Position to the left of elevator
          
          // Draw people in a queue next to the elevator
          const maxPeopleToShow = 5; // Limit how many people are shown to avoid crowding
          const visiblePeople = people.slice(0, maxPeopleToShow);
          
          visiblePeople.forEach((person, index) => {
            // Draw people in a diagonal queue leading to elevator
            const xOffset = waitingAreaX - (index * 7);
            const yOffset = y - 10 - (index * 3);
            person.draw(xOffset, yOffset);
          });
          
          // If there are more people than we're showing, indicate this
          if (people.length > maxPeopleToShow) {
            this.p.fill(0);
            this.p.textSize(10);
            this.p.text(`+${people.length - maxPeopleToShow} more`, waitingAreaX - 50, y - 30);
          }
        }
      });
    }
  }

  /**
   * Find the longest waiting time of any person on the given floor
   */
  private getLongestWaitTimeOnFloor(floor: number): number {
    if (this.waitingPeople[floor].length === 0) {
      return 0;
    }
    
    let longestWait = 0;
    for (const person of this.waitingPeople[floor]) {
      if (person.WaitTime > longestWait) {
        longestWait = person.WaitTime;
      }
    }
    return longestWait;
  }

  public addPerson(floor: number): void {
    // Fix for top floor and ground floor edge cases
    let targetFloor;
    
    if (floor === this.floors - 1) {
      // For top floor, person can only go down
      targetFloor = Math.floor(this.p.random(floor)); // Pick a random floor below
    } else if (floor === 0) {
      // For ground floor, person can only go up
      targetFloor = Math.floor(this.p.random(1, this.floors)); // Pick a random floor above
    } else {
      // For other floors, allow going either way, but not to their own floor
      do {
        targetFloor = Math.floor(this.p.random(this.floors));
      } while (targetFloor === floor);
    }
    
    // Create the new person and add them to the waiting people on this floor
    const person = new Person(this.p, floor, targetFloor);
    this.waitingPeople[floor].push(person);
    
    // Update floor stats and provide to elevator system
    const floorStats = this.getFloorStats();
    
    // Use the central elevator system to assign an elevator with floor stats
    const assignedElevator = this.elevatorSystem.assignElevatorToPerson(person, floor, floorStats);
    person.setAssignedElevator(assignedElevator);
    
    // Add the floor directly to the assigned elevator's visit queue
    this.elevators[assignedElevator].addFloorToVisit(floor);
    
    // Update button state (but don't trigger additional elevator assignment)
    if (!this.floorButtonPressed[floor]) {
      this.floorButtonPressed[floor] = true;
      this.floorButtonPressTime[floor] = this.p.millis();
    }
    
    // Invalidate the efficiency statistics cache when a new person is added
    this.invalidateStatisticsCache();
    
    // Debug current situation to help diagnose issues
    console.debug(`Person added at floor ${floor} going to ${targetFloor}, assigned elevator ${assignedElevator + 1}`);
    console.debug(`Elevator ${assignedElevator + 1} is at floor ${this.elevators[assignedElevator].currentFloor} in state ${ElevatorState[this.elevators[assignedElevator].currentState]}`);
  }
  
  /**
   * Get detailed statistics about each floor for elevator assignment
   */
  public getFloorStats(): FloorStats[] {
    const stats: FloorStats[] = [];
    
    for (let i = 0; i < this.floors; i++) {
      const people = this.waitingPeople[i];
      let maxWait = 0;
      let totalWait = 0;
      
      // Convert people to PersonData for the interface
      const waitingPeople = people.map(person => ({
        startFloor: person.startFloor,
        destinationFloor: person.destinationFloor,
        waitTime: person.waitTime
      }));
      
      people.forEach(person => {
        if (person.waitTime > maxWait) {
          maxWait = person.waitTime;
        }
        totalWait += person.waitTime;
      });
      
      const avgWait = people.length > 0 ? totalWait / people.length : 0;
      
      stats.push({
        floor: i,
        waitingCount: people.length,
        maxWaitTime: maxWait,
        avgWaitTime: avgWait,
        waitingPeople: waitingPeople
      });
    }
    
    return stats;
  }

  private loadPeopleToElevator(elevatorIndex: number, floor: number): void {
    const elevator = this.elevators[elevatorIndex];
    
    // Find people waiting at this floor for this specific elevator
    const peopleForThisElevator = this.waitingPeople[floor].filter(person => 
      person.getAssignedElevator() === elevatorIndex
    );
    
    // Diagnostic: Log when people should be boarding
    if (peopleForThisElevator.length > 0) {
      console.debug(`Elevator ${elevatorIndex + 1} at floor ${floor} found ${peopleForThisElevator.length} people waiting`);
    }
    
    // Keep track of people who will remain waiting
    const remainingPeople = [...this.waitingPeople[floor]];
    let boardedCount = 0;
    
    // Try to load people into the elevator
    for (const person of peopleForThisElevator) {
      if (elevator.addPerson(person)) {
        // Person got on the elevator
        if (this.warmupPhase) {
          this.peopleServedDuringWarmup.push(person);
        } else {
          this.peopleServedAfterWarmup.push(person);
          
          // Check if we've hit the stats update interval
          if (this.peopleServedAfterWarmup.length % this.statsUpdateInterval === 0 && 
              this.peopleServedAfterWarmup.length > this.lastStatsUpdateCount) {
            this.lastStatsUpdateCount = this.peopleServedAfterWarmup.length;
            
            // Calculate current stats and notify listeners
            if (this.onStatsUpdatedCallback) {
              const currentStats = this.getStatistics();
              this.onStatsUpdatedCallback(currentStats);
            }
          }
        }
        this.servedPeople.push(person);
        // Remove from waiting list
        const index = remainingPeople.indexOf(person);
        if (index !== -1) {
          remainingPeople.splice(index, 1);
          boardedCount++;
        }
      } else {
        console.debug(`Elevator ${elevatorIndex + 1} could not accept person going to floor ${person.DestinationFloor}`);
      }
    }
    
    if (boardedCount > 0) {
      console.debug(`${boardedCount} people boarded elevator ${elevatorIndex + 1}`);
    }
    
    // Update the waiting list for this floor
    this.waitingPeople[floor] = remainingPeople;
    
    // Check if we should turn off the button
    if (remainingPeople.length === 0) {
      this.floorButtonPressed[floor] = false;
    }
  }

  /**
   * Find people waiting for a broken elevator and reassign them
   */
  private reassignPeopleFromBrokenElevator(brokenElevatorIndex: number, floor: number): void {
    const peopleToReassign = this.waitingPeople[floor].filter(
      person => person.getAssignedElevator() === brokenElevatorIndex
    );
    
    if (peopleToReassign.length > 0) {
      console.debug(`Reassigning ${peopleToReassign.length} people from broken elevator ${brokenElevatorIndex + 1}`);
      
      for (const person of peopleToReassign) {
        // Find a new elevator
        const newElevator = this.findNewElevatorForPerson(brokenElevatorIndex, floor, person);
        person.setAssignedElevator(newElevator);
        
        // Update the new elevator's plan
        this.elevators[newElevator].addFloorToVisit(floor);
      }
    }
  }
  
  /**
   * Find a new elevator for a person when their assigned elevator breaks
   */
  private findNewElevatorForPerson(excludeElevatorIndex: number, floor: number, person: Person): number {
    let bestElevator = -1;
    
    // First try to find any available elevator
    for (let i = 0; i < this.elevators.length; i++) {
      if (i !== excludeElevatorIndex && this.elevators[i].currentState !== ElevatorState.REPAIR) {
        if (bestElevator === -1) bestElevator = i;
        break;
      }
    }
    
    // If no elevator is available, just assign to the first one (they'll have to wait for repair)
    if (bestElevator === -1) {
      bestElevator = (excludeElevatorIndex + 1) % this.elevators.length;
    }
    
    // Ideally use the elevator system to pick the best one
    try {
      const idealElevator = this.elevatorSystem.assignElevatorToPerson(person, floor);
      if (idealElevator !== excludeElevatorIndex && this.elevators[idealElevator].currentState !== ElevatorState.REPAIR) {
        bestElevator = idealElevator;
      }
    } catch (e) {
      console.error("Error reassigning elevator:", e);
    }
    
    return bestElevator;
  }

  public getStatistics() {
    const currentTime = this.p.millis();
    
    // Return cached statistics if it's been less than 1 second since last calculation
    if (this.cachedStatistics && 
        (currentTime - this.lastEfficiencyCalculation) < this.EFFICIENCY_CALC_INTERVAL) {
      return this.cachedStatistics;
    }
    
    // If we're here, we need to calculate fresh statistics
    this.lastEfficiencyCalculation = currentTime;
    
    // Calculate average wait time using only people after warmup
    let totalWaitTime = 0;
    let count = this.peopleServedAfterWarmup.length;
    
    this.peopleServedAfterWarmup.forEach(person => {
      totalWaitTime += person.WaitTime;
    });
    
    const avgWaitTime = count > 0 ? totalWaitTime / count : 0;
    
    // Calculate efficiency score with difficulty factors
    let efficiencyScore = 0;
    
    if (count > 0) {
      // Base score starts at 1000 points
      efficiencyScore = 1000;
      
      // Penalties remain the same
      const waitTimePenalty = Math.min(500, avgWaitTime * 15);
      efficiencyScore -= waitTimePenalty;
      
      const giveUpPenalty = Math.min(300, this.stairsUsedCount * 10);
      efficiencyScore -= giveUpPenalty;
      
      // Get utilization penalty
      const avgUtilization = this.calculateAverageUtilization();
      const utilizationPenalty = Math.min(200, Math.abs(avgUtilization - 0.7) * 200);
      efficiencyScore -= utilizationPenalty;
      
      // Apply difficulty bonuses - CORRECTED
      
      // 1. Elevator speed (1-10 scale, FASTER is EASIER)
      const elevSpeed = this.elevators.length > 0 ? (this.elevators[0] as any)._speed : 5;
      const speedBonus = Math.round((11 - elevSpeed) * 10); // Lower speed = higher bonus
      
      // 2. Elevator capacity (1-15 scale, SMALLER is HARDER)
      const elevCapacity = this.elevators.length > 0 ? (this.elevators[0] as any)._capacity : 8;
      const capacityBonus = Math.round((16 - elevCapacity) * 5); // Lower capacity = higher bonus
      
      // 3. People flow rate (higher is harder)
      const flowRate = this.calculateEstimatedFlowRate();
      const flowRateBonus = Math.min(150, flowRate * 15); // Higher flow = higher bonus
      
      // 4. Building complexity bonus (more floors, fewer elevators)
      const floorBonus = Math.min(100, (this.floors - 5) * 8); // More floors = higher bonus
      const elevatorPenalty = Math.min(100, Math.max(0, (4 - this.lanes) * 25)); // Fewer elevators = higher bonus
      
      // Apply bonuses
      const difficultyBonus = speedBonus + capacityBonus + flowRateBonus + floorBonus + elevatorPenalty;
      efficiencyScore += difficultyBonus;
      
      // Log detailed calculation for debugging
      console.debug(`Efficiency score calculation:
        Base: 1000
        Wait time penalty: -${waitTimePenalty.toFixed(1)} (${avgWaitTime.toFixed(1)}s avg wait)
        Give up penalty: -${giveUpPenalty} (${this.stairsUsedCount} people)
        Utilization penalty: -${utilizationPenalty.toFixed(1)} (${(avgUtilization * 100).toFixed(1)}% vs ideal 70%)
        Difficulty bonuses: +${difficultyBonus}
          - Speed: +${speedBonus} (speed: ${elevSpeed}, slower is harder)
          - Capacity: +${capacityBonus} (capacity: ${elevCapacity}, smaller is harder)
          - Flow rate: +${flowRateBonus} (flow: ${flowRate}, higher is harder)
          - Floors: +${floorBonus} (${this.floors} floors, more is harder)
          - Fewer elevators: +${elevatorPenalty} (${this.lanes} elevators, fewer is harder)
        Final score: ${Math.round(efficiencyScore)}
      `);
    }
    
    // Store the calculated statistics in cache
    this.cachedStatistics = {
      averageWaitTime: avgWaitTime,
      totalPeopleServed: count,
      peopleWhoGaveUp: this.stairsUsedCount,
      efficiencyScore: Math.max(0, Math.round(efficiencyScore)),
      warmupActive: this.warmupPhase,
      warmupTimeLeft: this.warmupPhase ? 
        Math.max(0, this.warmupPeriod - (currentTime - this.warmupStartTime) / 1000) :
         0
    };
    
    return this.cachedStatistics;
  }

  /**
   * Estimate the current people flow rate
   * This is needed since we don't have direct access to the simulation settings
   */
  private calculateEstimatedFlowRate(): number {
    // Try to estimate from spawn rate or just use a default
    return this.waitingPeople.reduce((sum, floor) => sum + floor.length, 0) / 20;
  }

  /**
   * Calculate the average utilization of all elevators
   */
  private calculateAverageUtilization(): number {
    const totalUtilization = this.elevators.reduce((sum, elevator) => {
      return sum + (elevator.numberOfPeople / elevator.capacity);
    }, 0);
    
    return totalUtilization / this.elevators.length;
  }

  public reset(settings: SimulationSettings): void {
    // Update settings
    this.floors = settings.numberOfFloors;
    this.lanes = settings.numberOfLanes;
    
    // Recalculate dimensions
    this.floorHeight = (this.p.height * 0.9) / (this.floors - 1);
    this.laneWidth = this.p.width / (this.lanes + 1);
    
    // Reset arrays
    this.elevators = [];
    this.waitingPeople = [];
    this.servedPeople = [];
    this.floorButtonPressed = [];
    this.floorButtonPressTime = [];
    
    // Reinitialize elevators
    for (let i = 0; i < this.lanes; i++) {
      this.elevators.push(new Elevator(
        this.p,
        i,
        this.laneWidth * (i + 1),
        settings.elevatorCapacity,
        settings.elevatorSpeed,
        this.floors,
        this.floorHeight
      ));
    }
    
    // Create a new elevator system as well
    this.elevatorSystem = new ElevatorSystem(this.elevators);
    
    // Reinitialize arrays for each floor
    for (let i = 0; i < this.floors; i++) {
      this.waitingPeople[i] = [];
      this.floorButtonPressed[i] = false;
      this.floorButtonPressTime[i] = 0;
    }

    // Also reset the efficiency measurement
    this.warmupPhase = true;
    this.warmupStartTime = this.p.millis();
    this.peopleServedAfterWarmup = [];
    this.peopleServedDuringWarmup = [];
    this.stairsUsedCount = 0;

    // Also reset the stats update counter
    this.lastStatsUpdateCount = 0;
  }

  public callElevator(floor: number): void {
    // This now just updates the button visual state
    // without triggering additional elevator assignments
    if (!this.floorButtonPressed[floor]) {
      this.floorButtonPressed[floor] = true;
      this.floorButtonPressTime[floor] = this.p.millis();
    }
  }

  /**
   * Get the elevator system
   */
  public getElevatorSystem(): ElevatorSystem {
    return this.elevatorSystem;
  }

  /**
   * Register a callback to be called when stats are updated
   */
  public onStatsUpdated(callback: (stats: any) => void): void {
    this.onStatsUpdatedCallback = callback;
    
    // Force a stats update if we already have data
    if (this.peopleServedAfterWarmup.length > 0 && !this.warmupPhase) {
      const currentStats = this.getStatistics();
      callback(currentStats);
    }
  }

  /**
   * Force a stats update (used when switching algorithms)
   */
  public forceStatsUpdate(): void {
    if (this.onStatsUpdatedCallback && this.peopleServedAfterWarmup.length > 0) {
      const currentStats = this.getStatistics();
      this.onStatsUpdatedCallback(currentStats);
    }
  }

  /**
   * Invalidate the cached statistics
   */
  public invalidateStatisticsCache(): void {
    this.cachedStatistics = null;
  }
}
