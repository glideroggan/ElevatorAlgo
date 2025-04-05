import { StatsTracker } from '../stats/StatsTracker';

export class ResultsPanel {
  private tableBody: HTMLElement;
  private clearButton: HTMLElement;
  private currentAlgorithmId: string = '';

  constructor() {
    this.tableBody = document.getElementById('results-table-body') as HTMLElement;
    this.clearButton = document.getElementById('clear-results') as HTMLElement;

    // Setup clear button
    this.clearButton.addEventListener('click', () => {
      StatsTracker.clearStoredResults(); // Fixed: use correct method name
      this.updateResultsTable();
    });

    // Initial load of results
    this.updateResultsTable();
  }

  /**
   * Set the currently active algorithm ID for highlighting
   */
  public setCurrentAlgorithm(algorithmId: string): void {
    this.currentAlgorithmId = algorithmId;
    this.updateResultsTable(); // Refresh table to apply highlighting
  }

  public updateResultsTable(): void {
    // Clear existing table rows
    while (this.tableBody.firstChild) {
      this.tableBody.removeChild(this.tableBody.firstChild);
    }

    const results = StatsTracker.getStoredResults();

    if (results.length === 0) {
      const noResultsRow = document.createElement('tr');
      noResultsRow.innerHTML = `<td colspan="6" class="no-results">No results yet</td>`;
      this.tableBody.appendChild(noResultsRow);
      return;
    }

    // Sort by score (highest score on top)
    const sortedResults = [...results].sort((a, b) => b.stats.efficiencyScore - a.stats.efficiencyScore);

    // Add rows to table
    sortedResults.forEach((result, index) => {
      const row = document.createElement('tr');
      
      // Highlight row if it matches the current algorithm
      if (result.algorithmId === this.currentAlgorithmId) {
        row.classList.add('current-algorithm');
      }

      // Format age instead of time
      const now = Date.now();
      const ageInMs = now - result.timestamp;
      let ageString = '';
      
      if (ageInMs < 60000) {
        // Less than a minute
        ageString = 'Just now';
      } else if (ageInMs < 3600000) {
        // Less than an hour
        const minutes = Math.floor(ageInMs / 60000);
        ageString = `${minutes}m ago`;
      } else if (ageInMs < 86400000) {
        // Less than a day
        const hours = Math.floor(ageInMs / 3600000);
        ageString = `${hours}h ago`;
      } else {
        // More than a day
        const days = Math.floor(ageInMs / 86400000);
        ageString = `${days}d ago`;
      }

      // Format config
      const configString = `${result.settings.numberOfLanes}E, ${result.settings.numberOfFloors}F, ${result.settings.peopleFlowRate}P`;
      
      // Add medal emoji based on index position (which is now score-based)
      let scoreDisplay = result.stats.efficiencyScore.toString();
      if (index === 0) scoreDisplay += ' 🥇';
      else if (index === 1) scoreDisplay += ' 🥈';
      else if (index === 2) scoreDisplay += ' 🥉';

      // Add cells
      row.innerHTML = `
        <td>${ageString}</td>
        <td>${result.algorithmName}</td>
        <td>${configString}</td>
        <td>${result.stats.peopleServed}</td>
        <td>${result.stats.averageWaitTime.toFixed(1)}s</td>
        <td class="score">${scoreDisplay}</td>
      `;

      this.tableBody.appendChild(row);
    });
  }
}
