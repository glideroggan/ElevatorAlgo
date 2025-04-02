import p5 from 'p5';

export class Person {
  private p: p5;
  private _startFloor: number;
  private _destinationFloor: number;
  private _waitingTime: number = 0;
  private _waitStartTime: number;
  private _color: p5.Color;
  private _assignedElevator: number = -1;

  // New properties for patience thresholds
  private _buttonRepressThreshold: number;  // Time before pressing button again
  private _giveUpThreshold: number;         // Time before giving up and "taking the stairs"
  private _lastButtonPressTime: number;
  private _hasGivenUp: boolean = false;
  private _isButtonRepressNeeded: boolean = false;

  constructor(p: p5, startFloor: number, destinationFloor: number) {
    this.p = p;
    this._startFloor = startFloor;
    this._destinationFloor = destinationFloor;
    this._waitStartTime = p.millis();
    this._lastButtonPressTime = p.millis();

    // Set patience thresholds - random for each person
    // Most people will repress the button between 15-40 seconds
    this._buttonRepressThreshold = p.random(15000, 40000);  // 15-40 seconds
    // Most people will give up after 60-180 seconds (1-3 minutes)
    this._giveUpThreshold = p.random(60000, 180000);      // 1-3 minutes

    // Assign a random color to the person for visualization
    this._color = p.color(
      p.random(100, 255),
      p.random(100, 255),
      p.random(100, 255)
    );
  }

  // Convert properties to getters
  get waitTime(): number {
    return this._waitingTime;
  }

  get destinationFloor(): number {
    return this._destinationFloor;
  }

  get startFloor(): number {
    return this._startFloor;
  }

  get assignedElevator(): number {
    return this._assignedElevator;
  }

  get hasGivenUp(): boolean {
    return this._hasGivenUp;
  }

  get isButtonRepressNeeded(): boolean {
    return this._isButtonRepressNeeded;
  }

  // For backwards compatibility
  get WaitTime(): number {
    return this._waitingTime;
  }

  get DestinationFloor(): number {
    return this._destinationFloor;
  }

  get StartFloor(): number {
    return this._startFloor;
  }

  public updateWaitingTime(): void {
    this._waitingTime = (this.p.millis() - this._waitStartTime) / 1000; // in seconds

    // Check if we should press the button again
    const timeSinceLastButtonPress = this.p.millis() - this._lastButtonPressTime;
    if (!this._isButtonRepressNeeded && timeSinceLastButtonPress > this._buttonRepressThreshold) {
      this._isButtonRepressNeeded = true;
    }

    // Check if we should give up
    if (!this._hasGivenUp && this.p.millis() - this._waitStartTime > this._giveUpThreshold) {
      this._hasGivenUp = true;
      console.log(`Person at floor ${this._startFloor} gave up after waiting ${this._waitingTime.toFixed(1)}s`);
    }
  }

  public resetButtonPressFlag(): void {
    this._isButtonRepressNeeded = false;
    this._lastButtonPressTime = this.p.millis();
  }

  public setAssignedElevator(elevatorIndex: number): void {
    this._assignedElevator = elevatorIndex;
  }

  public getAssignedElevator(): number {
    return this._assignedElevator;
  }

  public draw(x: number, y: number): void {
    // Draw person with different appearance based on state
    if (this._hasGivenUp) {
      // Draw as a person who has given up - faded color
      this.p.fill(this.p.color(100, 100, 100));
      this.p.textSize(8);
      this.p.text("↑stairs", x, y - 15);
    } else if (this._isButtonRepressNeeded) {
      // Draw as an impatient person - pulsing effect
      const pulse = Math.sin(this.p.millis() / 200) * 0.2 + 0.8;
      this.p.fill(this.p.lerpColor(this._color, this.p.color(255, 0, 0), pulse));
    } else {
      // Normal waiting person
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
