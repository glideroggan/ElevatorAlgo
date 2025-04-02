import p5 from 'p5';
import { Simulation } from './simulation/Simulation';
import { UIController } from './controllers/UIController';

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
    
    // Initialize the UI controller
    uiController = new UIController();
    
    // Create the simulation with initial settings
    const settings = uiController.getSimulationSettings();
    simulation = new Simulation(p, settings);
    
    // Set up event listeners for UI controls
    uiController.setupEventListeners(simulation);
  };

  p.draw = () => {
    p.background(240);
    simulation.update();
    simulation.draw();
    uiController.updateStats(simulation);
  };
};

// Start the sketch
new p5(sketch);
