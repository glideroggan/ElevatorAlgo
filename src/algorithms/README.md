# Creating Your Own Elevator Algorithm

To create your own elevator algorithm, follow these steps:

1. Create a new file with a name like `MyAlgorithm.ts` in the `algorithms` directory
2. Import the necessary classes and extend BaseElevatorAlgorithm
3. Implement the required methods: `assignElevatorToPerson` and `decideNextFloor`

## Template

```typescript
import { 
  PersonData, 
  BuildingData,
  ElevatorData
} from './IElevatorAlgorithm';
import { BaseElevatorAlgorithm } from './BaseElevatorAlgorithm';
import { ElevatorState } from '../models/Elevator';

export class MyAlgorithm extends BaseElevatorAlgorithm {
  readonly name = "My Algorithm Name";
  readonly description = "Description of how your algorithm works";
  
  assignElevatorToPerson(
    person: PersonData,
    startFloor: number,
    building: BuildingData
  ): number {
    // YOUR CODE: Decide which elevator should pick up this person
    // You'll want to examine each elevator and pick the best one based on your criteria
    
    let bestElevatorIndex = 0;
    let bestScore = Number.MIN_SAFE_INTEGER;
    
    building.elevators.forEach((elevator, index) => {
      // Skip elevators that are full or in repair
      if (elevator.passengers >= elevator.capacity || elevator.isInRepair) {
        return;
      }
      
      // Calculate your own custom score based on whatever factors you think are important
      let score = 0;
      
      // Example factors you might consider:
      // - Distance from elevator to pickup floor
      // - Current direction of elevator
      // - How full the elevator is
      // - How many stops it already has planned
      // - If the elevator will pass by the pickup floor anyway
      
      if (score > bestScore) {
        bestScore = score;
        bestElevatorIndex = index;
      }
    });
    
    return bestElevatorIndex;
  }
  
  decideNextFloor(
    elevator: ElevatorData,
    building: BuildingData
  ): number {
    // YOUR CODE: Decide which floor this elevator should go to next
    // This is called whenever an elevator needs to choose a new destination
    
    const floorsToVisit = elevator.floorsToVisit;
    
    if (floorsToVisit.length === 0) {
      return elevator.currentFloor; // Stay where we are if nowhere to go
    }
    
    // Implement your floor selection strategy here
    // For example, you might:
    // - Continue in the current direction if possible
    // - Prioritize dropoffs over pickups when the elevator is getting full
    // - Find the closest floor to visit to minimize travel time
    
    return this.findClosestFloor(elevator.currentFloor, floorsToVisit);
  }
  
  // You can add your own helper methods to calculate custom scores
  // or implement specific strategies for your algorithm
}
```

## Available Helper Methods

The BaseElevatorAlgorithm provides these helper methods:

- `findClosestFloor(currentFloor, floors)`: Finds the closest floor from the provided array
- `calculateDistanceToFloor(elevator, floor)`: Calculates travel distance considering elevator's current state
- `isFloorInSameDirection(elevator, floor)`: Checks if a floor is in the same direction the elevator is moving

## The ElevatorState Enum

The elevator state is represented by an enum with these values:

```typescript
enum ElevatorState {
  IDLE = 0,      // Not moving and no immediate tasks
  MOVING_UP = 1,  // Moving upward
  MOVING_DOWN = 2, // Moving downward
  LOADING = 3,   // Stopped at a floor for loading/unloading
  REPAIR = 4     // Out of service for maintenance
}
```

## Registering Your Algorithm

Add your algorithm to the system by adding these lines in `src/simulation/Simulation.ts`:

```typescript
import { MyAlgorithm } from '../algorithms/MyAlgorithm';

// In the constructor:
algorithmManager.registerAlgorithm('my-algorithm-id', new MyAlgorithm());
```
