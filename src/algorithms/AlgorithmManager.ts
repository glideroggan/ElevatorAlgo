import { IElevatorAlgorithm } from './IElevatorAlgorithm';
import { reg } from './scripts/register';

/**
 * Manages the available elevator algorithms and allows switching between them
 */
export class AlgorithmManager {
  // Change from Map to array for more consistent handling
  private algorithms: Array<{ id: string, algorithm: IElevatorAlgorithm }> = [];
  private currentAlgorithm: IElevatorAlgorithm;
  private currentAlgorithmId: string = '';
  
  constructor() {
    // Register the default algorithm
    const algos = reg();
    
    const defaultAlgo = algos[Math.floor(Math.random() * algos.length)];
    this.registerAlgorithm(defaultAlgo);
    this.currentAlgorithm = defaultAlgo;
    this.currentAlgorithmId = defaultAlgo.name;
  }
  
  /**
   * Register a new algorithm with optional custom ID
   */
  public registerAlgorithm(algorithm: IElevatorAlgorithm): void {
    const id = algorithm.name;
    console.debug(`Registering algorithm: ${algorithm.name} with ID: ${id}`);
    
    // Remove any existing algorithm with the same ID
    this.algorithms = this.algorithms.filter(a => a.id !== id);
    
    // Add the new algorithm
    this.algorithms.push({ id, algorithm });
  }
  
  /**
   * Switch to a different algorithm by ID
   */
  public setCurrentAlgorithm(id: string): boolean {
    const entry = this.algorithms.find(a => a.id === id);
    if (entry) {
      // Clean up the old algorithm if needed
      if (this.currentAlgorithm && this.currentAlgorithm.cleanup) {
        this.currentAlgorithm.cleanup();
      }
      
      this.currentAlgorithm = entry.algorithm;
      this.currentAlgorithmId = id;
      console.debug(`Switched to algorithm: ${entry.algorithm.name} with ID: ${id}`);
      return true;
    }
    console.warn(`Algorithm ID not found: ${id}`);
    return false;
  }
  
  /**
   * Get the currently active algorithm
   */
  public getCurrentAlgorithm(): IElevatorAlgorithm {
    return this.currentAlgorithm;
  }

  /**
   * Get the current algorithm ID
   */
  public getCurrentAlgorithmId(): string {
    return this.currentAlgorithmId;
  }
  
  /**
   * Get all registered algorithms
   */
  public getAlgorithms(): Array<{ id: string, algorithm: IElevatorAlgorithm }> {
    return this.algorithms;
  }

  /**
   * Get a specific algorithm by ID
   */
  public getAlgorithmById(id: string): IElevatorAlgorithm | undefined {
    const entry = this.algorithms.find(a => a.id === id);
    return entry?.algorithm;
  }

  /**
   * Debug: List all registered algorithms
   */
  public debugAlgorithms(): void {
    console.debug("Registered algorithms:", 
      this.algorithms.map(a => `${a.id} (${a.algorithm.name})`).join(", "));
    console.debug(`Current algorithm: ${this.currentAlgorithmId} (${this.currentAlgorithm.name})`);
  }
}
