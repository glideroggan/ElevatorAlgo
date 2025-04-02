import p5 from 'p5';
import { Person } from './Person';
import { ElevatorSystem } from './ElevatorSystem';
import { FloorStats } from '../algorithms/IElevatorAlgorithm';

export enum ElevatorState {
  IDLE,
  MOVING_UP,
  MOVING_DOWN,
  LOADING,
  REPAIR
}

export class Elevator {
  private p: p5;
  private _id: number;
  private _x: number;
  private _capacity: number;
  private _speed: number;
  private _totalFloors: number;
  private _floorHeight: number;

  private _currentFloor: number = 0;
  private _targetFloor: number = 0;
  private _y: number;
  private _state: ElevatorState = ElevatorState.IDLE;
  private _people: Person[] = [];
  private _floorsToVisit: Set<number> = new Set();
  private _loadingTimer: number = 0;
  private _loadingDuration: number = 1000; // 1 second loading time

  private unloadedPeople: { floor: number; count: number; time: number }[] = [];

  private stateStartTime: number = 0;
  private stuckThresholds: { [key in ElevatorState]: number } = {
    [ElevatorState.IDLE]: 20000,
    [ElevatorState.MOVING_UP]: 5000,
    [ElevatorState.MOVING_DOWN]: 5000,
    [ElevatorState.LOADING]: 3000,
    [ElevatorState.REPAIR]: 5000,
  };
  private stuckWarning: boolean = false;
  private repairStartTime: number = 0;
  private lastPositionY: number = 0;
  private positionCheckTimer: number = 0;
  private movementThreshold: number = 0.5;

  private stuckCheckTime: number = 0;
  private stuckCheckInterval: number = 1000;
  private positionHistory: number[] = [];
  private stateHistory: ElevatorState[] = [];
  private historySize: number = 5;

  private elevatorSystem: ElevatorSystem | null = null;

  private lastStateChangeTime: number = 0;
  private stateChangeHistory: Array<{ state: ElevatorState; time: number }> = [];
  private routeHistory: Array<{
    time: number;
    currentFloor: number;
    targetFloor: number;
    floorsToVisit: number[];
    passengerCount: number;
  }> = [];

  constructor(
    p: p5,
    id: number,
    x: number,
    capacity: number,
    speed: number,
    totalFloors: number,
    floorHeight: number
  ) {
    this.p = p;
    this._id = id;
    this._x = x;
    this._capacity = capacity;
    this._speed = speed;
    this._totalFloors = totalFloors;
    this._floorHeight = floorHeight;

    this._y = p.height - 40;
    this._currentFloor = 0;
    this.stateStartTime = p.millis();
    this.lastPositionY = this._y;
    this.stuckCheckTime = p.millis();

    for (let i = 0; i < this.historySize; i++) {
      this.positionHistory.push(this._y);
      this.stateHistory.push(this._state);
    }

    this.lastStateChangeTime = p.millis();
    this.stateChangeHistory.push({ state: this._state, time: this.lastStateChangeTime });
    this.logRouteUpdate();
  }

  // Properly implemented getters
  get id(): number {
    return this._id;
  }
  
  get isIdle(): boolean {
    return this._state === ElevatorState.IDLE;
  }

  get currentFloor(): number {
    return this._currentFloor;
  }

  get currentState(): ElevatorState {
    return this._state;
  }

  get currentDirection(): number {
    if (this._state === ElevatorState.MOVING_UP) return 1;
    if (this._state === ElevatorState.MOVING_DOWN) return -1;
    return 0;
  }

  get currentDestination(): number {
    return this._state === ElevatorState.IDLE ? -1 : this._targetFloor;
  }

  get xPosition(): number {
    return this._x;
  }

  get numberOfStops(): number {
    return this._floorsToVisit.size;
  }

  get floorsToVisit(): Set<number> {
    return new Set(this._floorsToVisit); // Return a copy to prevent direct modification
  }

  get passengerDestinations(): Set<number> {
    const destinations = new Set<number>();
    this._people.forEach((person) => destinations.add(person.DestinationFloor));
    return destinations;
  }

  get numberOfPeople(): number {
    return this._people.length;
  }
  
  get capacity(): number {
    return this._capacity;
  }

  public setElevatorSystem(system: ElevatorSystem): void {
    this.elevatorSystem = system;
  }
  
  // Backwards compatibility methods - fix recursive call issues
  public getCurrentFloor(): number {
    return this._currentFloor;
  }
  
  public getState(): ElevatorState {
    return this._state;
  }
  
  public getXPosition(): number {
    return this._x;
  }
  
  // Keep for compatibility with existing code
  get NumberOfPeople(): number {
    return this._people.length;
  }
  
  get Capacity(): number {
    return this._capacity;
  }

  public update(): void {
    const currentTime = this.p.millis();
    const previousState = this._state; // Track previous state

    if (this._state !== ElevatorState.REPAIR) {
      this.checkForLogicalErrors(currentTime);
    }

    if (
      (this._state === ElevatorState.IDLE || this._state === ElevatorState.LOADING) &&
      currentTime - this.stuckCheckTime >= this.stuckCheckInterval
    ) {
      this.updateHistory();
      this.stuckCheckTime = currentTime;
    }

    // Fix position check to add a grace period after state changes
    if (currentTime - this.positionCheckTimer > 500) {
      // Don't check for movement right after a state change
      const stateJustChanged = currentTime - this.stateStartTime < 1000; // 1 second grace period
      
      if (!stateJustChanged && 
          (this._state === ElevatorState.MOVING_UP || this._state === ElevatorState.MOVING_DOWN) &&
          Math.abs(this._y - this.lastPositionY) < this.movementThreshold) {
        console.warn(`Elevator ${this._id + 1} not making progress in ${this._state} state`);
        this.enterRepairMode("No position change detected after movement grace period");
      }
      this.lastPositionY = this._y;
      this.positionCheckTimer = currentTime;
    }

    // Track state changes and ensure stateStartTime is always updated
    if (this._state !== previousState) {
      const timeInPrevState = currentTime - this.stateStartTime;
      this.lastStateChangeTime = currentTime;
      this.stateStartTime = currentTime; // Reset state start time
      this.stateChangeHistory.push({ state: this._state, time: currentTime });
      
      // Reset position check variables on state change to avoid false positives
      this.lastPositionY = this._y;
      this.positionCheckTimer = currentTime;

      console.debug(
        `Elevator ${this._id + 1} changed from ${ElevatorState[previousState]} to ${ElevatorState[this._state]} after ${(timeInPrevState / 1000).toFixed(1)}s`
      );

      this.logRouteUpdate();
    }

    switch (this._state) {
      case ElevatorState.REPAIR:
        if (currentTime - this.repairStartTime >= this.stuckThresholds[ElevatorState.REPAIR]) {
          console.debug(`Elevator ${this._id + 1} repair complete - returning to service`);
          this._state = ElevatorState.IDLE;
          this.stateStartTime = currentTime;
          this.stuckWarning = false;
        }
        break;

      case ElevatorState.IDLE:
        if (this._floorsToVisit.size > 0) {
          if (this._floorsToVisit.has(this._currentFloor)) {
            console.debug(
              `Elevator ${this._id + 1} starting to load at floor ${this._currentFloor} (already here)`
            );
            this._floorsToVisit.delete(this._currentFloor);
            this._state = ElevatorState.LOADING;
            this.stateStartTime = currentTime;
            this._loadingTimer = currentTime;
          } else {
            this._targetFloor = this.getNextFloorFromSystem();

            // Ensure we have a valid target floor before proceeding
            if (typeof this._targetFloor !== 'number' || isNaN(this._targetFloor) || 
                this._targetFloor < 0 || this._targetFloor >= this._totalFloors) {
              console.error(`Elevator ${this._id + 1} received invalid target floor: ${this._targetFloor}`);
              this._targetFloor = this._currentFloor;
              this._floorsToVisit.delete(this._currentFloor);
              if (this._floorsToVisit.size > 0) {
                this._targetFloor = this.decideNextFloorLocally();
              } else {
                break;
              }
            }

            if (this._targetFloor === this._currentFloor) {
              this._floorsToVisit.delete(this._currentFloor);
              if (this._floorsToVisit.size > 0) {
                this._targetFloor = this.getNextFloorFromSystem();
              } else {
                break;
              }
            }

            // Only enter a moving state if the target floor is different from current floor
            if (this._targetFloor !== this._currentFloor) {
              this._state =
                this._targetFloor > this._currentFloor
                  ? ElevatorState.MOVING_UP
                  : ElevatorState.MOVING_DOWN;
              this.stateStartTime = currentTime;
            } else {
              // We're already at the target floor, so enter LOADING state directly
              this._state = ElevatorState.LOADING;
              this.stateStartTime = currentTime;
              this._floorsToVisit.delete(this._currentFloor);
              this.unloadPeopleAtFloor(this._currentFloor);
            }
          }
        }
        break;

      case ElevatorState.MOVING_UP:
        const targetYUp = this.p.height - this._targetFloor * this._floorHeight - 40;
        if (this._y > targetYUp) {
          this._y -= this._speed;
          if (this._y <= targetYUp) {
            this._y = targetYUp;
            this._currentFloor = this._targetFloor;
            this._floorsToVisit.delete(this._targetFloor);
            this._state = ElevatorState.LOADING;
            this.stateStartTime = currentTime;
            this.unloadPeopleAtFloor(this._currentFloor);
          }
        }
        break;

      case ElevatorState.MOVING_DOWN:
        const targetYDown = this.p.height - this._targetFloor * this._floorHeight - 40;
        if (this._y < targetYDown) {
          this._y += this._speed;
          if (this._y >= targetYDown) {
            this._y = targetYDown;
            this._currentFloor = this._targetFloor;
            this._floorsToVisit.delete(this._targetFloor);
            this._state = ElevatorState.LOADING;
            this.stateStartTime = currentTime;
            this.unloadPeopleAtFloor(this._currentFloor);
          }
        }
        break;

      case ElevatorState.LOADING:
        if (currentTime - this.stateStartTime >= this._loadingDuration) {
          this._state = ElevatorState.IDLE;
          this.stateStartTime = currentTime;
        }
        break;
    }

    this.unloadedPeople = this.unloadedPeople.filter(
      (item) => this.p.millis() - item.time < 2000
    );
  }


  private updateHistory(): void {
    this.positionHistory.shift();
    this.stateHistory.shift();

    this.positionHistory.push(this._y);
    this.stateHistory.push(this._state);
  }

  private checkForLogicalErrors(currentTime: number): void {
    if (currentTime - this.stuckCheckTime < this.stuckCheckInterval) {
      return;
    }

    this.updateHistory();
    this.stuckCheckTime = currentTime;

    const timeInCurrentState = currentTime - this.stateStartTime;
    if (timeInCurrentState < 500) { // Don't check if state just changed recently (within 0.5 seconds)
      return;
    }

    // Fix: Only check for stuck states if the elevator has been in that state for at least 2 seconds
    if (currentTime - this.stateStartTime < 2000) {
      return; // Skip checks for elevators that just changed state
    }

    if (
      this._state === ElevatorState.MOVING_UP &&
      this._currentFloor >= this._totalFloors - 1
    ) {
      console.warn(`Elevator ${this._id + 1} trying to move up at the top floor`);
      this.enterRepairMode("Attempted to move up at top floor");
      return;
    }

    if (this._state === ElevatorState.MOVING_DOWN && this._currentFloor <= 0) {
      console.warn(`Elevator ${this._id + 1} trying to move down at the ground floor`);
      this.enterRepairMode("Attempted to move down at ground floor");
      return;
    }

    if (
      this._state === ElevatorState.MOVING_UP ||
      this._state === ElevatorState.MOVING_DOWN
    ) {
      const isPositionStuck = this.positionHistory.every(
        (pos) => Math.abs(pos - this.positionHistory[0]) < this.movementThreshold
      );

      const isStateSame = this.stateHistory.every(
        (state) => state === this.stateHistory[0]
      );

      if (
        isPositionStuck &&
        isStateSame &&
        timeInCurrentState > this.stuckThresholds[this._state] &&
        timeInCurrentState > 2000 // At least 2 seconds in the same state
      ) {
        console.warn(
          `Elevator ${this._id + 1} stuck in ${ElevatorState[this._state]} state for ${(timeInCurrentState / 1000).toFixed(1)}s - position not changing`
        );
        this.enterRepairMode("No position change detected while moving");
        return;
      }
    }

    const timeInState = currentTime - this.stateStartTime;
    const threshold = this.stuckThresholds[this._state];

    if ((this._state === ElevatorState.LOADING || this._state === ElevatorState.IDLE) && 
        timeInState > threshold * 3) {
      if (!this.stuckWarning) {
        console.warn(
          `Elevator ${this._id + 1} stuck in ${ElevatorState[this._state]} state for ${(timeInState / 1000).toFixed(1)}s at floor ${this._currentFloor}`
        );
        this.stuckWarning = true;
      }

      if (this._state === ElevatorState.LOADING && timeInState > threshold * 4) {
        this.enterRepairMode("Loading state duration exceeded threshold");
      }
    } else {
      this.stuckWarning = false;
    }
  }

  private enterRepairMode(reason: string = "Unspecified error"): void {
    const timeInCurrentState = this.p.millis() - this.stateStartTime;
    
    // Don't break down if we just changed state (less than 1 second ago)
    if (timeInCurrentState < 1000) {
      console.debug(`Elevator ${this._id + 1} skipping unnecessary repair: ${reason} (state too new: ${timeInCurrentState}ms)`);
      return;
    }
    
    const stateHistory = this.stateChangeHistory.slice(-5).map(
      (h) =>
        `${ElevatorState[h.state]} at ${new Date(h.time).toISOString().substr(11, 8)}`
    );

    console.error(`
      ===== ELEVATOR ${this._id + 1} BREAKDOWN REPORT =====
      Reason: ${reason}
      Current state: ${ElevatorState[this._state]} for ${(timeInCurrentState / 1000).toFixed(1)}s
      Current floor: ${this._currentFloor}
      Target floor: ${this._targetFloor !== undefined ? this._targetFloor : "None"} 
      Position: ${this._y.toFixed(1)}px (expected: ${(this.p.height - this._currentFloor * this._floorHeight - 40).toFixed(
        1
      )}px)
      Passengers: ${this._people.length}/${this._capacity}
      Planned route: ${Array.from(this._floorsToVisit).join(" -> ")}
      Recent state changes: ${stateHistory.join(", ")}
      ==========================================
    `);

    const floorPos = this.p.height - this._currentFloor * this._floorHeight - 40;
    const currentFloorDist = Math.abs(this._y - floorPos);

    const floorAbovePos = this.p.height - (this._currentFloor + 1) * this._floorHeight - 40;
    const floorAboveDist = Math.abs(this._y - floorAbovePos);

    if (currentFloorDist > 5 && floorAboveDist > 5) {
      if (currentFloorDist < floorAboveDist) {
        this._y = floorPos;
      } else {
        this._y = floorAbovePos;
        this._currentFloor += 1;
      }
      console.debug(`Elevator ${this._id + 1} snapped to floor ${this._currentFloor} for repair`);
    }

    this.evacuatePassengers();
    this._floorsToVisit.clear();
    this._state = ElevatorState.REPAIR;
    this.repairStartTime = this.p.millis();
    this.stateStartTime = this.repairStartTime;
    this.stuckWarning = false;
  }

  private evacuatePassengers(): void {
    if (this._people.length > 0) {
      console.debug(`Evacuating ${this._people.length} passengers from elevator ${this._id + 1}`);
      this.unloadPeopleAtFloor(this._currentFloor);
    }
  }

  private logRouteUpdate(): void {
    const entry = {
      time: this.p.millis(),
      currentFloor: this._currentFloor,
      targetFloor: this._targetFloor,
      floorsToVisit: Array.from(this._floorsToVisit),
      passengerCount: this._people.length,
    };

    this.routeHistory.push(entry);

    if (this.routeHistory.length > 20) {
      this.routeHistory.shift();
    }
  }

  public draw(): void {
    this.p.stroke(100);
    this.p.line(this._x, 0, this._x, this.p.height);

    if (this._state === ElevatorState.REPAIR) {
      this.p.fill(100, 100, 100);
    } else {
      this.p.fill(200);
    }
    this.p.stroke(0);
    this.p.rect(this._x - 20, this._y, 40, 40);

    this.p.fill(0);
    this.p.noStroke();
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text(this._id + 1, this._x, this._y + 20);

    const capacityPercentage = this._people.length / this._capacity;
    this.p.fill(
      this.p.lerpColor(
        this.p.color(0, 255, 0),
        this.p.color(255, 0, 0),
        capacityPercentage
      )
    );
    this.p.rect(this._x - 15, this._y + 30, 30 * capacityPercentage, 5);

    this.p.fill(0);
    this.p.textAlign(this.p.CENTER);
    this.p.text(`${this._people.length}/${this._capacity}`, this._x, this._y + 10);

    let stateColor;
    switch (this._state) {
      case ElevatorState.IDLE:
        stateColor = this.p.color(150);
        break;
      case ElevatorState.MOVING_UP:
        stateColor = this.p.color(0, 255, 0);
        break;
      case ElevatorState.MOVING_DOWN:
        stateColor = this.p.color(255, 0, 0);
        break;
      case ElevatorState.LOADING:
        stateColor = this.p.color(255, 255, 0);
        break;
      case ElevatorState.REPAIR:
        stateColor = this.p.color(128, 0, 128);
        break;
    }

    if (this.stuckWarning) {
      const flashInterval = Math.floor((this.p.millis() / 250) % 2);
      stateColor = flashInterval === 0 ? this.p.color(255, 0, 0) : stateColor;
    }

    this.p.fill(stateColor);
    this.p.ellipse(this._x - 25, this._y + 5, 8, 8);

    if (this._state === ElevatorState.REPAIR) {
      const repairProgress =
        (this.p.millis() - this.repairStartTime) / this.stuckThresholds[ElevatorState.REPAIR];
      this.p.fill(128, 0, 128);
      this.p.text("REPAIRING", this._x, this._y - 35);

      this.p.noFill();
      this.p.stroke(128, 0, 128);
      this.p.rect(this._x - 15, this._y - 45, 30, 5);
      this.p.noStroke();
      this.p.fill(128, 0, 128);
      this.p.rect(this._x - 15, this._y - 45, 30 * repairProgress, 5);
    } else if (this.stuckWarning) {
      this.p.fill(255, 0, 0);
      this.p.text("STUCK", this._x, this._y - 35);
    }

    if (this._state !== ElevatorState.IDLE) {
      this.p.fill(0);
      this.p.textSize(10);
      this.p.text(`→ ${this._targetFloor}`, this._x + 25, this._y + 5);
    }

    if (this._floorsToVisit.size > 0) {
      this.p.textSize(8);
      this.p.fill(80);

      const passengerDestinations = new Set<number>();
      this._people.forEach((person) => passengerDestinations.add(person.DestinationFloor));

      const pickupFloors = Array.from(this._floorsToVisit)
        .filter((floor) => !passengerDestinations.has(floor))
        .join(",");

      const dropoffFloors = Array.from(passengerDestinations).join(",");

      if (dropoffFloors.length > 0) {
        this.p.text(`Drop: ${dropoffFloors}`, this._x, this._y - 15);
      }

      if (pickupFloors.length > 0) {
        this.p.text(`Pick: ${pickupFloors}`, this._x, this._y - 25);
      }
    }

    this.unloadedPeople.forEach((item) => {
      const floorY = this.p.height - item.floor * this._floorHeight;

      const alpha = this.p.map(this.p.millis() - item.time, 0, 2000, 255, 0);

      this.p.fill(0, 200, 255, alpha);
      this.p.noStroke();

      const baseX = this._x + 30;
      for (let i = 0; i < item.count; i++) {
        const offset = this.p.map(this.p.millis() - item.time, 0, 2000, 0, 50);
        this.p.ellipse(baseX + offset + i * 10, floorY - 10, 8, 8);
      }

      if (item.count > 1) {
        this.p.fill(0, 0, 0, alpha);
        this.p.text(`x${item.count}`, baseX + 20, floorY - 20);
      }
    });
  }

  private unloadPeopleAtFloor(floor: number): void {
    const peopleToUnload = this._people.filter(
      (person) => person.DestinationFloor === floor
    );

    if (peopleToUnload.length > 0) {
      // Record journey completion for each person
      peopleToUnload.forEach(person => {
        person.completeJourney();
      });
      
      this.unloadedPeople.push({
        floor: floor,
        count: peopleToUnload.length,
        time: this.p.millis(),
      });

      this._people = this._people.filter((person) => person.DestinationFloor !== floor);
    }
  }

  public isAtFloor(): boolean {
    return this._state === ElevatorState.LOADING;
  }

  public addPerson(person: Person): boolean {
    if (this._people.length < this._capacity) {
      person.startJourney(); // Mark the start of the journey
      this._people.push(person);
      this.addFloorToVisit(person.DestinationFloor);
      return true;
    }
    return false;
  }

  public addFloorToVisit(floor: number): void {
    this._floorsToVisit.add(floor);
  }

  public getDistanceToFloor(floor: number): number {
    if (this._state === ElevatorState.IDLE) {
      return Math.abs(this._currentFloor - floor);
    } else if (this._state === ElevatorState.MOVING_UP) {
      if (floor >= this._currentFloor) {
        return floor - this._currentFloor;
      } else {
        return (
          this._targetFloor - this._currentFloor +
          (this._targetFloor - floor)
        );
      }
    } else if (this._state === ElevatorState.MOVING_DOWN) {
      if (floor <= this._currentFloor) {
        return this._currentFloor - floor;
      } else {
        return (
          this._currentFloor - this._targetFloor +
          (floor - this._targetFloor)
        );
      }
    }

    return Math.abs(this._currentFloor - floor);
  }

  private getNextFloorFromSystem(): number {
    if (this.elevatorSystem) {
      // Get fresh floor stats directly from building
      let floorStats = undefined;
      const buildingRef = (window as any).simulationBuilding;
      if (buildingRef && typeof buildingRef.getFloorStats === 'function') {
        floorStats = buildingRef.getFloorStats();
      }
      
      // Pass floor stats to the decision function
      const nextFloor = this.elevatorSystem.decideNextFloor(this, floorStats);
      
      // Validate that we got a valid floor number
      if (typeof nextFloor === 'number' && !isNaN(nextFloor) && nextFloor >= 0 && nextFloor < this._totalFloors) {
        return nextFloor;
      } else {
        console.warn(`Elevator ${this._id + 1} received invalid floor: ${nextFloor}, falling back to local decision`);
      }
    }
    return this.decideNextFloorLocally();
  }

  private decideNextFloorLocally(): number {
    if (this._floorsToVisit.size === 0) {
      return this._currentFloor;
    }

    const passengerDestinations = new Set<number>();
    this._people.forEach((person) => passengerDestinations.add(person.DestinationFloor));

    const destinationsToVisit = Array.from(this._floorsToVisit).filter((floor) =>
      passengerDestinations.has(floor)
    );

    if (destinationsToVisit.length > 0) {
      let closestFloor = destinationsToVisit[0];
      let shortestDistance = Math.abs(this._currentFloor - closestFloor);

      for (const floor of destinationsToVisit) {
        const distance = Math.abs(this._currentFloor - floor);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closestFloor = floor;
        }
      }

      return closestFloor;
    }

    return this.findClosestFloorToVisit();
  }

  private findClosestFloorToVisit(): number {
    let closestFloor = -1;
    let shortestDistance = Number.MAX_VALUE;

    this._floorsToVisit.forEach((floor) => {
      const distance = Math.abs(this._currentFloor - floor);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestFloor = floor;
      }
    });

    return closestFloor === -1 ? this._currentFloor : closestFloor;
  }
}
