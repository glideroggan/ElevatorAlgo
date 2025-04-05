import { BaseElevatorAlgorithm } from "../BaseElevatorAlgorithm"
import { DefaultElevatorAlgorithm } from "./DefaultElevatorAlgorithm"
import { Simple1 } from "./simple2"
import { Simple3 } from "./simple3"
import { Simple4 } from "./simple4"
import { Simple5 } from "./simple5"
import { Simple6 } from "./simple6"
import { Simple7 } from "./simple7"
import { SimplePlayerAlgorithm } from "./SimplePlayerAlgorithm"
import { CustomAlgorithmEvaluator } from "../CustomAlgorithmEvaluator";

/**
 * Register all available algorithms, including custom algorithms from localStorage
 */
export const reg = async (): Promise<BaseElevatorAlgorithm[]> => {
    const builtInAlgorithms = [
        new SimplePlayerAlgorithm,
        new DefaultElevatorAlgorithm,
        new Simple1,
        new Simple3,
        new Simple4,
        new Simple5,
        new Simple6,
        new Simple7
    ];

    // Try to load custom algorithm from localStorage
    const customAlgo = await loadCustomAlgorithmFromStorage();
    if (customAlgo) {
        console.debug("Custom algorithm loaded from localStorage");
        builtInAlgorithms.push(customAlgo);
    }
    
    return builtInAlgorithms;
}

/**
 * Attempt to load and compile a custom algorithm from localStorage
 */
async function loadCustomAlgorithmFromStorage(): Promise<BaseElevatorAlgorithm | null> {
    try {
        const storedCode = localStorage.getItem('elevatorAlgorithmCode');
        if (!storedCode) {
            return null;
        }
        
        console.debug("Found custom algorithm code in localStorage");
        
        // Use the evaluator to compile the algorithm
        const evaluator = CustomAlgorithmEvaluator.getInstance();
        const success = await evaluator.evaluateCode(storedCode);
        
        if (success) {
            const customAlgo = evaluator.getCustomAlgorithm();
            if (customAlgo) {
                return customAlgo as unknown as BaseElevatorAlgorithm;
            }
        }
        
        console.warn("Failed to load custom algorithm from localStorage");
        return null;
    } catch (error) {
        console.error("Error loading custom algorithm from localStorage:", error);
        return null;
    }
}