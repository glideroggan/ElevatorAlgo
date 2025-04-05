// /// <reference path="/node_modules/@types/elevator-algorithms/index.d.ts" />
import { BaseElevatorAlgorithm } from "@elevator-base";
// TODO: let these also come from same namespace as above
import { PersonData, BuildingData, ElevatorData, FloorStats } from "@elevator-interfaces";

/**
 * Example Elevator Algorithm Implementation
 * 
 * This template demonstrates how to create a custom elevator algorithm.
 * Your algorithm must extend BaseElevatorAlgorithm and implement two key methods.
 * 
 * === AVAILABLE DATA STRUCTURES ===
 * 
 * PersonData {
 *   startFloor: number;        // The floor where the person is waiting
 *   destinationFloor: number;  // The floor the person wants to go to
 *   waitTime: number;          // How long the person has been waiting (seconds)
 * }
 * 
 * ElevatorData {
 *   id: number;                        // Unique ID of this elevator
 *   currentFloor: number;              // Current floor position
 *   targetFloor: number | null;        // Floor the elevator is currently heading to (or null if idle)
 *   state: 'IDLE' | 'MOVING_UP' | 'MOVING_DOWN' | 'LOADING' | 'REPAIR';  // Current state
 *   direction: number;                 // Current direction: 1 (up), -1 (down), 0 (idle)
 *   passengers: number;                // Number of people currently in the elevator
 *   capacity: number;                  // Maximum number of people the elevator can hold
 *   floorsToVisit: number[];           // Array of floors the elevator needs to visit
 *   passengerDestinations: number[];   // Array of floors where passengers want to go
 *   isInRepair: boolean;               // Whether the elevator is currently under repair
 * }
 * 
 * BuildingData {
 *   totalFloors: number;               // Total number of floors in the building
 *   totalElevators: number;            // Total number of elevators in the building
 *   elevators: ElevatorData[];         // Array of all elevators in the building
 *   floorStats: FloorStats[];          // Statistics about waiting people on each floor
 * }
 * 
 * FloorStats {
 *   floor: number;                     // Floor number
 *   waitingCount: number;              // Number of people waiting on this floor
 *   totalMaxWaitTime: number;          // Maximum wait time across all people on this floor
 *   totalAvgWaitTime: number;          // Average wait time across all people on this floor
 *   waitingPeople?: PersonData[];      // Optional: Information about people waiting on this floor
 *   perElevatorStats?: {               // Optional: Statistics per elevator for this floor
 *     elevatorId: number;              // Elevator ID
 *     waitingCount: number;            // Number of people assigned to this elevator
 *     maxWaitTime: number;             // Maximum wait time for people assigned to this elevator
 *     avgWaitTime: number;             // Average wait time for people assigned to this elevator
 *   }[];
 * }
 * 
 * === ELEVATOR STATES ===
 * 
 * IDLE: Elevator is not moving and waiting for assignments
 * MOVING_UP: Elevator is moving upward toward a target floor
 * MOVING_DOWN: Elevator is moving downward toward a target floor  
 * LOADING: Elevator is stopped at a floor, loading/unloading passengers
 * REPAIR: Elevator is under repair and temporarily unavailable
 * 
 * === HELPER METHODS FROM BaseElevatorAlgorithm ===
 * 
 * These methods are available to you through inheritance:
 * 
 * findClosestFloor(currentFloor, floorsList): Returns the closest floor to the current floor
 * findClosestElevator(floor, elevators): Returns index of the closest elevator to the given floor
 * findElevatorWithShortestQueue(elevators): Returns index of elevator with fewest floors to visit
 * findElevatorWithMostCapacity(elevators): Returns index of elevator with most available capacity
 * calculateDistance(elevatorFloor, targetFloor): Calculates distance between floors
 */
class Example extends BaseElevatorAlgorithm {
    /**
     * The name of your algorithm - will appear in the dropdown menu.
     * Choose something unique!
     */
    name = "My Custom Algorithm";

    /**
     * A brief description of how your algorithm works.
     * This will be displayed in the UI below the algorithm dropdown.
     */
    description = "This algorithm implements a custom elevator control strategy.";

    /**
     * Assigns an elevator to pick up a person waiting on a floor.
     * This method is called when a person presses the call button.
     * 
     * @param person - The person requesting an elevator
     * @param startFloor - The floor where the person is waiting
     * @param building - Data about the building state 
     * @returns The index of the elevator to assign (0 to building.elevators.length - 1)
     * 
     * OPTIMIZATION TIPS:
     * - Consider elevator's current direction, load, and distance
     * - Prioritize elevators already heading toward the person
     * - Balance load across multiple elevators
     * - Avoid assigning full elevators
     * - Consider people's waiting time to avoid starvation
     */
    assignElevatorToPerson(person: PersonData, startFloor: number, building: BuildingData): number {
        // Implement your algorithm here
        
        return 0
    }

    /**
     * Decides which floor an elevator should go to next.
     * This method is called whenever an elevator needs to decide its next destination.
     * 
     * @param elevator - The elevator that needs a decision
     * @param building - Data about the building state
     * @returns The next floor the elevator should visit
     * 
     * OPTIMIZATION TIPS:
     * - Consider people's waiting time to avoid excessive waits
     * - Prioritize floors with passengers that need to be dropped off
     * - Balance between picking up new people and serving current passengers
     */
    decideNextFloor(elevator: ElevatorData, building: BuildingData): number {
        // IMPLEMENTATION GUIDE:
        // 1. If there are no floors to visit, return current floor
        if (elevator.floorsToVisit.length === 0) {
            return elevator.currentFloor;
        }
        
        // 2. Simple implementation - just visit the next floor in the list
        return elevator.floorsToVisit[0];
    }
}