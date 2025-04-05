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

// Storage key prefix for custom algorithms
const CUSTOM_ALGO_PREFIX = 'elevatorAlgo_';

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

    // Load all custom algorithms from localStorage
    const customAlgos = await loadCustomAlgorithmsFromStorage();
    if (customAlgos.length > 0) {
        console.debug(`Loaded ${customAlgos.length} custom algorithms from localStorage`);
        builtInAlgorithms.push(...customAlgos);
    }
    
    return builtInAlgorithms;
}

/**
 * Attempt to load and compile all custom algorithms from localStorage
 */
async function loadCustomAlgorithmsFromStorage(): Promise<BaseElevatorAlgorithm[]> {
    try {
        const customAlgos: BaseElevatorAlgorithm[] = [];
        
        // Support legacy storage key
        const legacyCode = localStorage.getItem('elevatorAlgorithmCode');
        if (legacyCode) {
            const algo = await compileAndCreateAlgorithm(legacyCode);
            if (algo) {
                customAlgos.push(algo);
                
                // Migrate to new format
                saveCustomAlgorithm(algo.name, legacyCode);
                localStorage.removeItem('elevatorAlgorithmCode');
            }
        }
        
        // Load all algorithms stored with the prefix
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CUSTOM_ALGO_PREFIX)) {
                const code = localStorage.getItem(key);
                if (code) {
                    const algo = await compileAndCreateAlgorithm(code);
                    if (algo) {
                        customAlgos.push(algo);
                    }
                }
            }
        }
        
        return customAlgos;
    } catch (error) {
        console.error("Error loading custom algorithms from localStorage:", error);
        return [];
    }
}

/**
 * Compile and create an algorithm from code
 */
async function compileAndCreateAlgorithm(code: string): Promise<BaseElevatorAlgorithm | null> {
    const evaluator = CustomAlgorithmEvaluator.getInstance();
    const success = await evaluator.evaluateCode(code);
    
    if (success) {
        const customAlgo = evaluator.getCustomAlgorithm();
        if (customAlgo) {
            return customAlgo as unknown as BaseElevatorAlgorithm;
        }
    }
    return null;
}

/**
 * Save a custom algorithm to localStorage
 */
export function saveCustomAlgorithm(name: string, code: string): void {
    const storageKey = CUSTOM_ALGO_PREFIX + name;
    localStorage.setItem(storageKey, code);
    console.debug(`Saved custom algorithm '${name}' to localStorage`);
}

/**
 * Get the code for a custom algorithm by name
 */
export function getCustomAlgorithmCode(name: string): string | null {
    const storageKey = CUSTOM_ALGO_PREFIX + name;
    return localStorage.getItem(storageKey);
}

/**
 * Check if an algorithm is a custom one (created by user)
 */
export function isCustomAlgorithm(name: string): boolean {
    const storageKey = CUSTOM_ALGO_PREFIX + name;
    return localStorage.getItem(storageKey) !== null;
}