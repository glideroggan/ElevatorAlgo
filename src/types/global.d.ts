import { Building } from '../models/Building';
import { AlgorithmManager } from '../algorithms/AlgorithmManager';
import { IElevatorAlgorithm } from '../algorithms/IElevatorAlgorithm';

// Extend the Window interface to add our global properties
declare global {
  interface Window {
    // Building reference for cross-component access
    simulationBuilding: Building | undefined;
    
    // For tracking algorithm manager between resets
    prevAlgorithmManager: AlgorithmManager | undefined;
    
    // For evaluating custom algorithms
    _evaluatedAlgorithm?: new () => IElevatorAlgorithm;
    
    // Monaco editor
    monaco: any;
    
    // TypeScript compiler from CDN
    ts?: {
      transpile: (code: string, options?: any) => string;
      ScriptTarget: { ES2020: any, ESNext: any };
      ModuleKind: { ESNext: any, CommonJS: any };
    };
  }
}

// This file acts as a module
export {};
