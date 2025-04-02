import { IElevatorAlgorithm } from './IElevatorAlgorithm';
import { DefaultElevatorAlgorithm } from './scripts/DefaultElevatorAlgorithm';
import { reg } from './scripts/register';

/**
 * Manages the available elevator algorithms and allows switching between them
 */
export class AlgorithmManager {
  private algorithms: Map<string, IElevatorAlgorithm> = new Map();
  private currentAlgorithm: IElevatorAlgorithm;
  
  constructor() {
    // Register the default algorithm
    const algos = reg()
    console.debug('algos', algos) 
    const defaultAlgo = algos.find((algo) => algo.name === 'Simple3') || new DefaultElevatorAlgorithm();
    this.algorithms.set(defaultAlgo.name, defaultAlgo);
    this.currentAlgorithm = defaultAlgo;
  }
  
  /**
   * Register a new algorithm
   */
  public registerAlgorithm(algorithm: IElevatorAlgorithm): void {
    console.debug(`Registering algorithm: ${algorithm.name}`);
    this.algorithms.set(algorithm.name, algorithm);
  }
  
  /**
   * Switch to a different algorithm by ID
   */
  public setCurrentAlgorithm(id: string): boolean {
    const algorithm = this.algorithms.get(id);
    if (algorithm) {
      // Clean up the old algorithm if needed
      if (this.currentAlgorithm.cleanup) {
        this.currentAlgorithm.cleanup();
      }
      
      this.currentAlgorithm = algorithm;
      return true;
    }
    return false;
  }
  
  /**
   * Get the currently active algorithm
   */
  public getCurrentAlgorithm(): IElevatorAlgorithm {
    return this.currentAlgorithm;
  }
  
  /**
   * Get all registered algorithms
   */
  public getAlgorithms(): Array<{ id: string, algorithm: IElevatorAlgorithm }> {
    return Array.from(this.algorithms.entries()).map(([id, algorithm]) => ({
      id,
      algorithm
    }));
  }
}
