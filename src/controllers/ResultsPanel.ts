import { StatsTracker, SimulationResult } from '../stats/StatsTracker';

export class ResultsPanel {
  private resultsTableBody: HTMLElement;
  
  constructor() {
    this.resultsTableBody = document.getElementById('results-table-body') as HTMLElement;
    
    // Set up clear button
    const clearButton = document.getElementById('clear-results') as HTMLButtonElement;
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all saved results?')) {
          StatsTracker.clearStoredResults();
          this.updateResultsTable();
        }
      });
    }
    
    // Initial population
    this.updateResultsTable();
  }
  
  /**
   * Update the results table with data from localStorage
   */
  public updateResultsTable(): void {
    if (!this.resultsTableBody) return;
    
    const results = StatsTracker.getStoredResults();
    
    // Clear existing rows
    this.resultsTableBody.innerHTML = '';
    
    // Sort by efficiency score (highest first) rather than timestamp
    results.sort((a, b) => b.stats.efficiencyScore - a.stats.efficiencyScore);
    
    // Add rows for each result
    results.forEach(result => {
      const row = document.createElement('tr');
      
      // Format date
      const date = new Date(result.timestamp);
      const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      
      // Calculate difficulty rating
      const difficultyScore = this.calculateDifficultyRating(result.settings);
      const difficultyStars = '★'.repeat(Math.min(5, difficultyScore)) + 
                            '☆'.repeat(Math.max(0, 5 - difficultyScore));
      
      // Add cells with compact layout
      row.innerHTML = `
        <td title="${date.toLocaleString()}">${dateStr}</td>
        <td>${result.algorithmName}</td>
        <td>
          <div>${result.settings.numberOfLanes}×${result.settings.numberOfFloors}</div>
          <div class="config-details">
            Flow: ${result.settings.peopleFlowRate} • Speed: ${result.settings.elevatorSpeed} • Cap: ${result.settings.elevatorCapacity}<br>
            <span title="Difficulty rating based on settings">${difficultyStars}</span>
          </div>
        </td>
        <td>${result.stats.peopleServed}<br><small>${result.stats.peopleWhoGaveUp} gave up</small></td>
        <td>${result.stats.averageWaitTime.toFixed(1)}s</td>
        <td class="score">${result.stats.efficiencyScore}</td>
      `;
      
      // Highlight high scores
      if (result.stats.efficiencyScore > 700) {
        row.querySelector('.score')?.classList.add('high-score');
      }
      
      this.resultsTableBody.appendChild(row);
    });
    
    // If no results, show message
    if (results.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="no-results">No simulation results yet</td>`;
      this.resultsTableBody.appendChild(row);
    }
  }

  /**
   * Calculate difficulty rating (1-5 scale) based on simulation settings - CORRECTED
   */
  private calculateDifficultyRating(settings: any): number {
    // Factors that make the simulation harder:
    // - High flow rate (harder)
    // - Slow elevators (harder)
    // - Small elevator capacity (harder)
    // - Many floors (harder)
    // - Few elevators (harder)

    let score = 0;
    
    // Flow rate: 1-10 points (1-20 scale) - HIGHER IS HARDER (correct)
    score += settings.peopleFlowRate / 2;
    
    // Speed: 10-1 points (1-10 scale) - SLOWER IS HARDER (corrected)
    score += (11 - settings.elevatorSpeed) / 2;
    
    // Capacity: 15-1 points (1-15 scale) - SMALLER IS HARDER (corrected)
    score += (16 - settings.elevatorCapacity) / 3;
    
    // Floors: 0-10 points - MORE FLOORS IS HARDER (correct)
    score += Math.min(10, (settings.numberOfFloors - 3) / 2);
    
    // Elevators: 9-0 points - FEWER ELEVATORS IS HARDER (correct)
    score += Math.max(0, (11 - settings.numberOfLanes) / 2);
    
    // Convert to 1-5 star rating
    return Math.max(1, Math.min(5, Math.round(score / 10 * 5)));
  }
}
