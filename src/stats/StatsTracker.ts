/**
 * Class responsible for tracking simulation statistics and persisting them to localStorage
 */
export class StatsTracker {
  private static readonly STORAGE_KEY = 'elevator_simulation_results';
  
  /**
   * Saves the current simulation results to localStorage
   */
  public static saveSimulationResult(stats: SimulationResult): void {
    // Get existing results
    const existingResults = this.getStoredResults();
    
    // Check for a very similar result already saved within the last minute
    const isDuplicate = existingResults.some(existing => 
      Math.abs(existing.timestamp - stats.timestamp) < 60000 && // Within a minute
      existing.algorithmId === stats.algorithmId &&
      existing.settings.numberOfLanes === stats.settings.numberOfLanes &&
      existing.settings.numberOfFloors === stats.settings.numberOfFloors &&
      existing.settings.peopleFlowRate === stats.settings.peopleFlowRate &&
      Math.abs(existing.stats.peopleServed - stats.stats.peopleServed) < 10 // Similar people count
    );
    
    // Skip saving if it seems like a duplicate
    if (isDuplicate) {
      console.debug('Skipping duplicate stats save');
      return;
    }
    
    // Add current result
    existingResults.push(stats);
    
    // Keep only the last 20 results to avoid filling localStorage
    if (existingResults.length > 20) {
      existingResults.shift();
    }
    
    // Save back to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingResults));
    
    console.debug('Saved simulation result:', stats);
  }
  
  /**
   * Get all stored simulation results
   */
  public static getStoredResults(): SimulationResult[] {
    try {
      const storedResults = localStorage.getItem(this.STORAGE_KEY);
      if (!storedResults) return [];
      
      return JSON.parse(storedResults);
    } catch (error) {
      console.error('Error loading stored results:', error);
      return [];
    }
  }
  
  /**
   * Clear all stored simulation results
   */
  public static clearStoredResults(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * Represents a saved simulation result
 */
export interface SimulationResult {
  timestamp: number;
  algorithmId: string;
  algorithmName: string;
  settings: {
    numberOfLanes: number;
    numberOfFloors: number;
    peopleFlowRate: number;
    elevatorSpeed: number;
    elevatorCapacity: number;
  };
  stats: {
    peopleServed: number;
    averageWaitTime: number;
    peopleWhoGaveUp: number;
    efficiencyScore: number;
  };
}
