/**
 * A seeded random number generator for deterministic simulation
 */
export class SeededRandom {
  private seed: number;
  private m = 2147483647;  // 2^31 - 1
  private a = 16807;       // 7^5
  private c = 0;           // LCG parameter
  
  constructor(seed: number = Date.now()) {
    this.seed = seed % this.m;
    if (this.seed <= 0) this.seed += this.m - 1;
    
    // Warm up the generator
    for (let i = 0; i < 10; i++) {
      this.random();
    }
  }
  
  /**
   * Returns a random number between 0 (inclusive) and 1 (exclusive)
   */
  public random(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }
  
  /**
   * Returns a random integer between min (inclusive) and max (exclusive)
   */
  public randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }
  
  /**
   * Returns a random number between min (inclusive) and max (exclusive)
   */
  public randomRange(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }
  
  /**
   * Returns true with probability p
   */
  public randomBool(p: number = 0.5): boolean {
    return this.random() < p;
  }
  
  /**
   * Reset the generator with a new seed
   */
  public setSeed(seed: number): void {
    this.seed = seed % this.m;
    if (this.seed <= 0) this.seed += this.m - 1;
    
    // Warm up the generator
    for (let i = 0; i < 10; i++) {
      this.random();
    }
  }
  
  /**
   * Get current seed
   */
  public getSeed(): number {
    return this.seed;
  }
}
