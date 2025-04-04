import p5 from 'p5';
import { Person } from './Person';
import { ElevatorSystem } from './ElevatorSystem';

export type ElevatorStatusState = 'IDLE' | 'MOVING_UP' | 'MOVING_DOWN' | 'LOADING' | 'REPAIR';

export interface ElevatorState {
  id: number;
  state: ElevatorStatusState
  floor: number;
  passengers: number;
  capacity: number;
}

type Point = {
  x: number;
  y: number;
}

export class Elevator {
  private p: p5;
  id: number;
  render: Point
  capacity: number;
  speed: number;
  totalFloors: number;
  floorHeight: number;
  currentFloor: number = 0;
  targetFloor: number = 0;

  state: ElevatorStatusState = 'IDLE';
  people: Person[] = [];
  floorsToVisit: Set<number> = new Set();
  loadingDuration: number = 1000; // 1 second loading time

  private unloadedPeople: { floor: number; count: number; time: number }[] = [];

  private stateStartTime: number = 0;
  private stuckThresholds: { [key in ElevatorStatusState]: number } = {
    ['IDLE']: 20000,
    ['MOVING_UP']: 5000,
    ['MOVING_DOWN']: 5000,
    ['LOADING']: 3000,
    ['REPAIR']: 5000,
  };
  private stuckWarning: boolean = false;
  private repairStartTime: number = 0;
  private lastPositionY: number = 0;
  private positionCheckTimer: number = 0;
  private movementThreshold: number = 0.5;

  private stuckCheckTime: number = 0;
  private stuckCheckInterval: number = 1000;
  private positionHistory: number[] = [];
  private stateHistory: ElevatorStatusState[] = [];
  private historySize: number = 5;

  private elevatorSystem: ElevatorSystem | null = null;

  private lastStateChangeTime: number = 0;
  private stateChangeHistory: Array<{ state: ElevatorStatusState; time: number }> = [];
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
    this.id = id;
    this.render = { x: x, y: p.height - 40 };
    this.capacity = capacity;
    this.speed = speed;
    this.totalFloors = totalFloors;
    this.floorHeight = floorHeight;

    this.currentFloor = 0;
    this.stateStartTime = p.millis();
    this.lastPositionY = this.render.y;
    this.stuckCheckTime = p.millis();

    for (let i = 0; i < this.historySize; i++) {
      this.positionHistory.push(this.render.y);
      this.stateHistory.push(this.state);
    }

    this.lastStateChangeTime = p.millis();
    this.stateChangeHistory.push({ state: this.state, time: this.lastStateChangeTime });
    this.logRouteUpdate();
  }

  get isIdle(): boolean {
    return this.state === 'IDLE';
  }

  get currentState(): ElevatorStatusState {
    return this.state;
  }

  get currentDirection(): number {
    if (this.state === 'MOVING_UP') return 1;
    if (this.state === 'MOVING_DOWN') return -1;
    return 0;
  }

  get currentDestination(): number {
    return this.state === 'IDLE' ? -1 : this.targetFloor;
  }

  get numberOfStops(): number {
    return this.floorsToVisit.size;
  }

  get passengerDestinations(): Set<number> {
    const destinations = new Set<number>();
    this.people.forEach((person) => destinations.add(person.destinationFloor));
    return destinations;
  }

  public setElevatorSystem(system: ElevatorSystem): void {
    this.elevatorSystem = system;
  }

  public update(): void {
    const currentTime = this.p.millis();

    if (this.state !== 'REPAIR') {
      this.checkForLogicalErrors(currentTime);
    }

    if (
      (this.state === 'IDLE' || this.state === 'LOADING') &&
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
        (this.state === 'MOVING_UP' || this.state === 'MOVING_DOWN') &&
        Math.abs(this.render.y - this.lastPositionY) < this.movementThreshold) {
        console.warn(`Elevator ${this.id + 1} not making progress in ${this.state} state`);
        this.enterRepairMode("No position change detected after movement grace period");
      }
      this.lastPositionY = this.render.y;
      this.positionCheckTimer = currentTime;
    }

    switch (this.state) {
      case 'REPAIR':
        if (currentTime - this.repairStartTime >= this.stuckThresholds['REPAIR']) {
          console.debug(`Elevator ${this.id + 1} repair complete - returning to service`);
          this.changeState('IDLE', currentTime);
        }
        break;

      case 'IDLE':
        if (this.floorsToVisit.size > 0) {
          if (this.floorsToVisit.has(this.currentFloor)) {
            console.debug(
              `Elevator ${this.id + 1} starting to load at floor ${this.currentFloor} (already here)`
            );
            this.changeState('LOADING', currentTime);
          } else {
            this.targetFloor = this.getNextFloorFromSystem();

            if (this.targetFloor === undefined || this.targetFloor === null || this.targetFloor < 0 || this.targetFloor >= this.totalFloors) break;

            if (this.targetFloor === this.currentFloor) {
              console.debug(
                `Elevator ${this.id + 1} already at target floor ${this.targetFloor}`
              );
              this.changeState('LOADING', currentTime);
              break
            }

            this.changeState(
              this.targetFloor > this.currentFloor ? 'MOVING_UP' : 'MOVING_DOWN',currentTime)
          }
        }
        break;

      case 'MOVING_UP':
        const targetYUp = this.p.height - this.targetFloor * this.floorHeight - 40;
        if (this.render.y > targetYUp) {
          this.render.y -= this.speed;
          if (this.render.y <= targetYUp) {
            this.render.y = targetYUp;
            this.currentFloor = this.targetFloor;
            // this.floorsToVisit.delete(this.targetFloor);
            this.changeState('LOADING', currentTime);
          }
        }
        break;

      case 'MOVING_DOWN':
        const targetYDown = this.p.height - this.targetFloor * this.floorHeight - 40;
        if (this.render.y < targetYDown) {
          this.render.y += this.speed;
          if (this.render.y >= targetYDown) {
            this.render.y = targetYDown;
            this.currentFloor = this.targetFloor;
            this.changeState('LOADING', currentTime);
          }
        }
        break;

      case 'LOADING':
        this.floorsToVisit.delete(this.currentFloor);
        this.unloadPeopleAtFloor(this.currentFloor);
        if (currentTime - this.stateStartTime >= this.loadingDuration) {
          this.changeState('IDLE', currentTime);
        }
        break;
    }

    this.unloadedPeople = this.unloadedPeople.filter(
      (item) => this.p.millis() - item.time < 2000
    );
  }

  private changeState(newState: ElevatorStatusState, currentTime: number): void {
    this.state = newState;
    this.stateStartTime = currentTime;
  }


  private updateHistory(): void {
    this.positionHistory.shift();
    this.stateHistory.shift();

    this.positionHistory.push(this.render.y);
    this.stateHistory.push(this.state);
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
      this.state === 'MOVING_UP' &&
      this.currentFloor >= this.totalFloors - 1
    ) {
      console.warn(`Elevator ${this.id + 1} trying to move up at the top floor`);
      this.enterRepairMode("Attempted to move up at top floor");
      return;
    }

    if (this.state === 'MOVING_DOWN' && this.currentFloor <= 0) {
      console.warn(`Elevator ${this.id + 1} trying to move down at the ground floor`);
      this.enterRepairMode("Attempted to move down at ground floor");
      return;
    }

    if (
      this.state === 'MOVING_UP' ||
      this.state === 'MOVING_DOWN'
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
        timeInCurrentState > this.stuckThresholds[this.state] &&
        timeInCurrentState > 2000 // At least 2 seconds in the same state
      ) {
        console.warn(
          `Elevator ${this.id + 1} stuck in ${this.state} state for ${(timeInCurrentState / 1000).toFixed(1)}s - position not changing`
        );
        this.enterRepairMode("No position change detected while moving");
        return;
      }
    }

    const timeInState = currentTime - this.stateStartTime;
    const threshold = this.stuckThresholds[this.state];

    if ((this.state === 'LOADING' || this.state === 'IDLE') &&
      timeInState > threshold * 3) {
      if (!this.stuckWarning) {
        console.warn(
          `Elevator ${this.id + 1} stuck in ${this.state} state for ${(timeInState / 1000).toFixed(1)}s at floor ${this.currentFloor}`
        );
        this.stuckWarning = true;
      }

      if (this.state === 'LOADING' && timeInState > threshold * 4) {
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
      console.debug(`Elevator ${this.id + 1} skipping unnecessary repair: ${reason} (state too new: ${timeInCurrentState}ms)`);
      return;
    }

    const stateHistory = this.stateChangeHistory.slice(-5).map(
      (h) =>
        `${h.state} at ${new Date(h.time).toISOString().substr(11, 8)}`
    );

    console.error(`
      ===== ELEVATOR ${this.id + 1} BREAKDOWN REPORT =====
      Reason: ${reason}
      Current state: ${this.state} for ${(timeInCurrentState / 1000).toFixed(1)}s
      Current floor: ${this.currentFloor}
      Target floor: ${this.targetFloor !== undefined ? this.targetFloor : "None"} 
      Position: ${this.render.y.toFixed(1)}px (expected: ${(this.p.height - this.currentFloor * this.floorHeight - 40).toFixed(
      1
    )}px)
      Passengers: ${this.people.length}/${this.capacity}
      Planned route: ${Array.from(this.floorsToVisit).join(" -> ")}
      Recent state changes: ${stateHistory.join(", ")}
      ==========================================
    `);

    const floorPos = this.p.height - this.currentFloor * this.floorHeight - 40;
    const currentFloorDist = Math.abs(this.render.y - floorPos);

    const floorAbovePos = this.p.height - (this.currentFloor + 1) * this.floorHeight - 40;
    const floorAboveDist = Math.abs(this.render.y - floorAbovePos);

    if (currentFloorDist > 5 && floorAboveDist > 5) {
      if (currentFloorDist < floorAboveDist) {
        this.render.y = floorPos;
      } else {
        this.render.y = floorAbovePos;
        this.currentFloor += 1;
      }
      console.debug(`Elevator ${this.id + 1} snapped to floor ${this.currentFloor} for repair`);
    }

    this.evacuatePassengers();
    this.floorsToVisit.clear();
    this.state = 'REPAIR';
    this.repairStartTime = this.p.millis();
    this.stateStartTime = this.repairStartTime;
    this.stuckWarning = false;
  }

  private evacuatePassengers(): void {
    if (this.people.length > 0) {
      console.debug(`Evacuating ${this.people.length} passengers from elevator ${this.id + 1}`);
      this.unloadPeopleAtFloor(this.currentFloor);
    }
  }

  private logRouteUpdate(): void {
    const entry = {
      time: this.p.millis(),
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor,
      floorsToVisit: Array.from(this.floorsToVisit),
      passengerCount: this.people.length,
    };

    this.routeHistory.push(entry);

    if (this.routeHistory.length > 20) {
      this.routeHistory.shift();
    }
  }

  public draw(): void {
    this.p.stroke(100);
    this.p.line(this.render.x, 0, this.render.x, this.p.height);

    if (this.state === 'REPAIR') {
      this.p.fill(100, 100, 100);
    } else {
      this.p.fill(200);
    }
    this.p.stroke(0);
    this.p.rect(this.render.x - 20, this.render.y, 40, 40);

    this.p.fill(0);
    this.p.noStroke();
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text(this.id + 1, this.render.x, this.render.y + 20);

    const capacityPercentage = this.people.length / this.capacity;
    this.p.fill(
      this.p.lerpColor(
        this.p.color(0, 255, 0),
        this.p.color(255, 0, 0),
        capacityPercentage
      )
    );
    this.p.rect(this.render.x - 15, this.render.y + 30, 30 * capacityPercentage, 5);

    this.p.fill(0);
    this.p.textAlign(this.p.CENTER);
    this.p.text(`${this.people.length}/${this.capacity}`, this.render.x, this.render.y + 10);

    let stateColor;
    switch (this.state) {
      case 'IDLE':
        stateColor = this.p.color(150);
        break;
      case 'MOVING_UP':
        stateColor = this.p.color(0, 255, 0);
        break;
      case 'MOVING_DOWN':
        stateColor = this.p.color(255, 0, 0);
        break;
      case 'LOADING':
        stateColor = this.p.color(255, 255, 0);
        break;
      case 'REPAIR':
        stateColor = this.p.color(128, 0, 128);
        break;
    }

    if (this.stuckWarning) {
      const flashInterval = Math.floor((this.p.millis() / 250) % 2);
      stateColor = flashInterval === 0 ? this.p.color(255, 0, 0) : stateColor;
    }

    this.p.fill(stateColor);
    this.p.ellipse(this.render.x - 25, this.render.y + 5, 8, 8);

    if (this.state === 'REPAIR') {
      const repairProgress =
        (this.p.millis() - this.repairStartTime) / this.stuckThresholds['REPAIR'];
      this.p.fill(128, 0, 128);
      this.p.text("REPAIRING", this.render.x, this.render.y - 35);

      this.p.noFill();
      this.p.stroke(128, 0, 128);
      this.p.rect(this.render.x - 15, this.render.y - 45, 30, 5);
      this.p.noStroke();
      this.p.fill(128, 0, 128);
      this.p.rect(this.render.x - 15, this.render.y - 45, 30 * repairProgress, 5);
    } else if (this.stuckWarning) {
      this.p.fill(255, 0, 0);
      this.p.text("STUCK", this.render.x, this.render.y - 35);
    }

    if (this.state !== 'IDLE') {
      this.p.fill(0);
      this.p.textSize(10);
      this.p.text(`→ ${this.targetFloor}`, this.render.x + 25, this.render.y + 5);
    }

    if (this.floorsToVisit.size > 0) {
      this.p.textSize(8);
      this.p.fill(80);

      const passengerDestinations = new Set<number>();
      this.people.forEach((person) => passengerDestinations.add(person.destinationFloor));

      const pickupFloors = Array.from(this.floorsToVisit)
        .filter((floor) => !passengerDestinations.has(floor))
        .join(",");

      const dropoffFloors = Array.from(passengerDestinations).join(",");

      if (dropoffFloors.length > 0) {
        this.p.text(`Drop: ${dropoffFloors}`, this.render.x, this.render.y - 15);
      }

      if (pickupFloors.length > 0) {
        this.p.text(`Pick: ${pickupFloors}`, this.render.x, this.render.y - 25);
      }
    }

    this.unloadedPeople.forEach((item) => {
      const floorY = this.p.height - item.floor * this.floorHeight;

      const alpha = this.p.map(this.p.millis() - item.time, 0, 2000, 255, 0);

      this.p.fill(0, 200, 255, alpha);
      this.p.noStroke();

      const baseX = this.render.x + 30;
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
    const peopleToUnload = this.people.filter(
      (person) => person.destinationFloor === floor
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

      this.people = this.people.filter((person) => person.destinationFloor !== floor);
    }
  }

  public isAtFloor(): boolean {
    return this.state === 'LOADING';
  }

  public addPerson(person: Person): boolean {
    if (this.people.length < this.capacity) {
      person.startJourney(); // Mark the start of the journey
      this.people.push(person);
      this.addFloorToVisit(person.destinationFloor);
      return true;
    }
    return false;
  }

  public addFloorToVisit(floor: number): void {
    this.floorsToVisit.add(floor);
  }

  // public getDistanceToFloor(floor: number): number {
  //   if (this.state === 'IDLE') {
  //     return Math.abs(this.currentFloor - floor);
  //   } else if (this.state === 'MOVING_UP') {
  //     if (floor >= this.currentFloor) {
  //       return floor - this.currentFloor;
  //     } else {
  //       return (
  //         this.targetFloor - this.currentFloor +
  //         (this.targetFloor - floor)
  //       );
  //     }
  //   } else if (this.state === 'MOVING_DOWN') {
  //     if (floor <= this.currentFloor) {
  //       return this.currentFloor - floor;
  //     } else {
  //       return (
  //         this.currentFloor - this.targetFloor +
  //         (floor - this.targetFloor)
  //       );
  //     }
  //   }

  //   return Math.abs(this.currentFloor - floor);
  // }

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
      if (typeof nextFloor === 'number' && !isNaN(nextFloor) && nextFloor >= 0 && nextFloor < this.totalFloors) {
        return nextFloor;
      } else {
        console.warn(`Elevator ${this.id + 1} received invalid floor: ${nextFloor}, falling back to local decision`);
        return this.currentFloor
      }
    }
    return this.currentFloor
  }
}
