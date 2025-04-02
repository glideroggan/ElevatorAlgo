import p5 from 'p5';

export class Person {
  private p: p5;
  private _startFloor: number;
  private _destinationFloor: number;
  private _waitingTime: number = 0;
  private _waitStartTime: number;
  private _journeyTime: number = 0; // Time spent in elevator
  private _journeyStartTime: number = 0; // When person enters elevator
  private _color: p5.Color;
  private _assignedElevator: number = -1;

  // Keep only the give-up mechanism, remove button repress
  private _giveUpThreshold: number;  // Time before giving up and "taking the stairs"
  private _hasGivenUp: boolean = false;

  constructor(p: p5, startFloor: number, destinationFloor: number) {
    this.p = p;
    this._startFloor = startFloor;
    this._destinationFloor = destinationFloor;
    this._waitStartTime = p.millis();

    // Most people will give up after 30-90 seconds
    this._giveUpThreshold = p.random(30000, 90000);  // 30-90 seconds

    // Assign a random color to the person for visualization
    this._color = p.color(
      p.random(100, 255),
      p.random(100, 255),
      p.random(100, 255)
    );
  }

  // Keep these getters
  get waitTime(): number {
    return this._waitingTime;
  }
  
  get journeyTime(): number {
    return this._journeyTime;
  }
  
  // For backward compatibility
  get WaitTime(): number {
    return this._waitingTime;
  }
  
  get DestinationFloor(): number {
    return this._destinationFloor;
  }

  get StartFloor(): number {
    return this._startFloor;
  }

  get totalServiceTime(): number {
    return this._waitingTime + this._journeyTime; // Total time from arrival to destination
  }

  get assignedElevator(): number {
    return this._assignedElevator;
  }

  get hasGivenUp(): boolean {
    return this._hasGivenUp;
  }

  public updateWaitingTime(): void {
    this._waitingTime = (this.p.millis() - this._waitStartTime) / 1000; // in seconds

    // Remove button repress check, keep only the give up check
    if (!this._hasGivenUp && this.p.millis() - this._waitStartTime > this._giveUpThreshold) {
      this._hasGivenUp = true;
      console.debug(`Person at floor ${this._startFloor} gave up after waiting ${this._waitingTime.toFixed(1)}s`);
    }
  }

  public startJourney(): void {
    // Call this when a person enters an elevator
    this._journeyStartTime = this.p.millis();
    // Final wait time recorded at moment of elevator entry
    this._waitingTime = (this._journeyStartTime - this._waitStartTime) / 1000;
  }
  
  public completeJourney(): void {
    // Call this when a person reaches their destination
    if (this._journeyStartTime > 0) {
      this._journeyTime = (this.p.millis() - this._journeyStartTime) / 1000;
      console.debug(`Person completed journey from ${this._startFloor} to ${this._destinationFloor}: Wait time: ${this._waitingTime.toFixed(1)}s, Journey time: ${this._journeyTime.toFixed(1)}s`);
    }
  }

  public setAssignedElevator(elevatorIndex: number): void {
    this._assignedElevator = elevatorIndex;
  }

  public getAssignedElevator(): number {
    return this._assignedElevator;
  }

  public draw(x: number, y: number): void {
    // Update visual appearance - remove the impatient person styling
    if (this._hasGivenUp) {
      // Draw as a person who has given up - faded color
      this.p.fill(this.p.color(100, 100, 100));
      this.p.textSize(8);
      this.p.text("↑stairs", x, y - 15);
    } else {
      // Normal waiting person (no more impatient state)
      this.p.fill(this._color);
    }

    this.p.noStroke();
    this.p.ellipse(x, y, 10, 10);

    // Fix the arrow direction to correctly indicate travel direction
    this.p.stroke(0);
    const dir = this._destinationFloor > this._startFloor ? 1 : -1;
    this.p.line(x, y - 5, x, y + 5);
    
    // Fix: If going up (dir=1), draw arrow at top; if going down (dir=-1), draw at bottom
    const arrowY = dir > 0 ? y - 5 : y + 5; // Arrow at top for up, bottom for down
    
    // Draw the arrowhead correctly - pointing in actual travel direction
    this.p.line(x, arrowY, x - 3, arrowY + (dir * 3));
    this.p.line(x, arrowY, x + 3, arrowY + (dir * 3));

    // Show assigned elevator
    if (this._assignedElevator !== -1 && !this._hasGivenUp) {
      this.p.noStroke();
      this.p.fill(0);
      this.p.textSize(8);
      this.p.text(`E${this._assignedElevator + 1}`, x, y - 10);
    }

    // Show waiting time for those waiting a long time
    if (this._waitingTime > 30 && !this._hasGivenUp) {
      this.p.fill(255, 0, 0);
      this.p.textSize(7);
      this.p.text(`${Math.floor(this._waitingTime)}s`, x, y + 10);
    }
  }
}
