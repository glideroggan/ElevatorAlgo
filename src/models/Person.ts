import p5 from 'p5';

export class Person {
  private p: p5;
  startFloor: number;
  destinationFloor: number;
  waitingTime: number = 0;
  waitStartTime: number;
  journeyTime: number = 0; // Time spent in elevator
  journeyStartTime: number = 0; // When person enters elevator
  color: p5.Color;
  assignedElevator: number = -1;

  // Keep only the give-up mechanism, remove button repress
  giveUpThreshold: number;  // Time before giving up and "taking the stairs"
  hasGivenUp: boolean = false;

  constructor(p: p5, startFloor: number, destinationFloor: number) {
    this.p = p;
    this.startFloor = startFloor;
    this.destinationFloor = destinationFloor;
    this.waitStartTime = p.millis();

    // Most people will give up after 30-90 seconds
    this.giveUpThreshold = p.random(30000, 90000);  // 30-90 seconds

    // Assign a random color to the person for visualization
    this.color = p.color(
      p.random(100, 255),
      p.random(100, 255),
      p.random(100, 255)
    );
  }

  // Keep these getters
  get waitTime(): number {
    return this.waitingTime;
  }
  
  // get journeyTime(): number {
  //   return this.journeyTime;
  // }
  
  // For backward compatibility
  // get WaitTime(): number {
  //   return this.waitingTime;
  // }
  
  // get DestinationFloor(): number {
  //   return this.destinationFloor;
  // }

  // get StartFloor(): number {
  //   return this.startFloor;
  // }

  get totalServiceTime(): number {
    return this.waitingTime + this.journeyTime; // Total time from arrival to destination
  }

  // get assignedElevator(): number {
  //   return this.assignedElevator;
  // }

  // get hasGivenUp(): boolean {
  //   return this.hasGivenUp;
  // }

  public updateWaitingTime(): void {
    this.waitingTime = (this.p.millis() - this.waitStartTime) / 1000; // in seconds

    // Remove button repress check, keep only the give up check
    if (!this.hasGivenUp && this.p.millis() - this.waitStartTime > this.giveUpThreshold) {
      this.hasGivenUp = true;
      console.debug(`Person at floor ${this.startFloor} gave up after waiting ${this.waitingTime.toFixed(1)}s`);
    }
  }

  public startJourney(): void {
    // Call this when a person enters an elevator
    this.journeyStartTime = this.p.millis();
    // Final wait time recorded at moment of elevator entry
    this.waitingTime = (this.journeyStartTime - this.waitStartTime) / 1000;
  }
  
  public completeJourney(): void {
    // Call this when a person reaches their destination
    if (this.journeyStartTime > 0) {
      this.journeyTime = (this.p.millis() - this.journeyStartTime) / 1000;
      console.debug(`Person completed journey from ${this.startFloor} to ${this.destinationFloor}: Wait time: ${this.waitingTime.toFixed(1)}s, Journey time: ${this.journeyTime.toFixed(1)}s`);
    }
  }

  public setAssignedElevator(elevatorIndex: number): void {
    this.assignedElevator = elevatorIndex;
  }

  public getAssignedElevator(): number {
    return this.assignedElevator;
  }

  public draw(x: number, y: number): void {
    // Update visual appearance - remove the impatient person styling
    if (this.hasGivenUp) {
      // Draw as a person who has given up - faded color
      this.p.fill(this.p.color(100, 100, 100));
      this.p.textSize(8);
      this.p.text("↑stairs", x, y - 15);
    } else {
      // Normal waiting person (no more impatient state)
      this.p.fill(this.color);
    }

    this.p.noStroke();
    this.p.ellipse(x, y, 10, 10);

    // Fix the arrow direction to correctly indicate travel direction
    this.p.stroke(0);
    const dir = this.destinationFloor > this.startFloor ? 1 : -1;
    this.p.line(x, y - 5, x, y + 5);
    
    // Fix: If going up (dir=1), draw arrow at top; if going down (dir=-1), draw at bottom
    const arrowY = dir > 0 ? y - 5 : y + 5; // Arrow at top for up, bottom for down
    
    // Draw the arrowhead correctly - pointing in actual travel direction
    this.p.line(x, arrowY, x - 3, arrowY + (dir * 3));
    this.p.line(x, arrowY, x + 3, arrowY + (dir * 3));

    // Show assigned elevator
    if (this.assignedElevator !== -1 && !this.hasGivenUp) {
      this.p.noStroke();
      this.p.fill(0);
      this.p.textSize(8);
      this.p.text(`E${this.assignedElevator + 1}`, x, y - 10);
    }

    // Show waiting time for those waiting a long time
    if (this.waitingTime > 30 && !this.hasGivenUp) {
      this.p.fill(255, 0, 0);
      this.p.textSize(7);
      this.p.text(`${Math.floor(this.waitingTime)}s`, x, y + 10);
    }
  }
}
