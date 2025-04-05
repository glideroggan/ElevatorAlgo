import p5 from 'p5';
import { Simulation } from './simulation/Simulation';
import { UIController } from './controllers/UIController';
import { AlgorithmEditor } from './components/AlgorithmEditor';
import { Modal } from './components/Modal';
import { CustomAlgorithmEvaluator } from './algorithms/CustomAlgorithmEvaluator';

// Create the simulation and UI controller
let simulation: Simulation;
let uiController: UIController;

// Create a new p5 instance
const sketch = (p: p5) => {
  p.setup = () => {
    // Create a canvas that fits precisely in the container
    const canvasContainer = document.getElementById('canvas-container');
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    // Set the canvas container dimensions explicitly
    if (canvasContainer) {
      canvasContainer.style.width = canvasWidth + "px";
      canvasContainer.style.height = canvasHeight + "px";
    }
    
    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvas-container');
    
    // Set framerate to 60 FPS to limit CPU usage
    p.frameRate(60);
    
    // Initialize the UI controller
    uiController = new UIController();
    
    // Create the simulation with initial settings
    const settings = uiController.getSimulationSettings();
    simulation = new Simulation(p, settings);
    
    // Set up event listeners for UI controls
    uiController.setupEventListeners(simulation);
    
    // Wait for simulation to be ready before populating the algorithms dropdown
    simulation.onReady(() => {
      console.debug("Simulation is ready, populating algorithms in UI controller...");
      uiController.populateAlgorithms(simulation);
    });
  };

  p.draw = () => {
    p.background(240);
    simulation.update();
    simulation.draw();
    uiController.updateStats(simulation);
  };
};

// Start the sketch
const p5Instance = new p5(sketch);
p5Instance.noLoop(); // Prevent continuous drawing unless needed

(window as any).p5Instance = p5Instance; // Make p5 instance globally accessible

// Initialize the editor modal
const editorModal = new Modal('editor-modal', 'Elevator Algorithm Editor');
// Don't append just the content element, the modal is already added to DOM in constructor
// document.body.appendChild(editorModal.getContentElement());

// Create editor container
const editorContainer = document.createElement('div');
editorContainer.id = 'code-editor-container';
editorContainer.className = 'code-editor-container';
editorModal.getContentElement().appendChild(editorContainer);

// Initialize the code editor only after page is fully loaded
window.addEventListener('load', () => {
  // Initialize the code editor
  const editor = new AlgorithmEditor('code-editor-container');

  // Set up the edit algorithm button
  const editAlgorithmButton = document.getElementById('edit-algorithm');
  if (editAlgorithmButton) {
    editAlgorithmButton.addEventListener('click', async () => {
      // Get the currently selected algorithm
      const algorithmsDropdown = document.getElementById('algorithm-select') as HTMLSelectElement;
      const selectedAlgorithmId = algorithmsDropdown?.value;
      
      // Import the isCustomAlgorithm function
      const { isCustomAlgorithm } = await import('./algorithms/scripts/register');
      
      // Check if it's a custom algorithm (user-created)
      if (selectedAlgorithmId && isCustomAlgorithm(selectedAlgorithmId)) {
        // Load this specific algorithm's code
        await editor.loadAlgorithmByName(selectedAlgorithmId);
      } else {
        // For built-in algorithms, load the template
        await editor.resetCode();
      }
      
      // Open the editor modal
      editorModal.open();
    });
  }

  // Handle saving the algorithm
  editor.onSave(async (code) => {
    console.debug("Saving algorithm code:", code);
    const evaluator = CustomAlgorithmEvaluator.getInstance();
    try {
      const success = await evaluator.evaluateCode(code);
      
      if (success) {
        const customAlgorithm = evaluator.getCustomAlgorithm();
        if (customAlgorithm) {
          // Get the elevator system and algorithm manager
          if (!window.simulationBuilding) {
            console.error("No simulation building available");
            return;
          }
          
          const elevatorSystem = window.simulationBuilding.getElevatorSystem();
          const algorithmManager = elevatorSystem.getAlgorithmManager();
          
          // Register the custom algorithm
          algorithmManager.registerAlgorithm(customAlgorithm);
          
          // Import the saveCustomAlgorithm function
          const { saveCustomAlgorithm } = await import('./algorithms/scripts/register');
          
          // Save the algorithm code with its name as the identifier
          saveCustomAlgorithm(customAlgorithm.name, code);
          
          // Debug: Log all registered algorithms
          algorithmManager.debugAlgorithms();
          
          // Switch to the custom algorithm
          const success = elevatorSystem.setAlgorithm(customAlgorithm.name);
          
          if (success) {
            console.debug(`Successfully switched to custom algorithm: ${customAlgorithm.name}`);
            
            // Update the UI to reflect the new algorithm
            uiController.populateAlgorithms(simulation);
            uiController.selectAlgorithm(customAlgorithm.name);
            
            // Reset the simulation to ensure the new algorithm takes effect
            console.debug("Resetting simulation to apply custom algorithm");
            simulation.reset(uiController.getSimulationSettings());
            
            // Close the modal
            editorModal.close();
          } else {
            console.error("Failed to switch to custom algorithm!");
            alert('Error: Failed to activate the custom algorithm');
          }
        } else {
          console.error("Custom algorithm is null after successful evaluation");
          alert('Error: Failed to create algorithm instance');
        }
      } else {
        // Show the error
        alert(`Error in algorithm: ${evaluator.getErrorState() || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during algorithm evaluation:', error);
      alert(`Error evaluating algorithm: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
});
