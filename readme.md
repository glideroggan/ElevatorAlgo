# TODO
- lets start with a POC where we have the basics
- the algo shouldn't suggest an elevator that seems stuck, so each elevator should track its own errors
- when adding a floor to an elevator, we should probably re-optimize the route for the elevator

# BUG
- looks like elevator is stopping on floors to pick up ppl, even though the elevator is full


# description
Create a "game" where the goal of the game is to reach as much efficiency as possible. You can adjust how many elevator "lanes" the building have, and also how many floors.
We want to show the elevators in a canvas in the browser, and show ppl, as dots, moving up and down the elevator lanes. The elevators will be represented as boxes?, and the dots will be represented as circles.
Floors can be horizontal lines, and the elevators can be vertical lines. The elevators will be represented as boxes

How do you "play" the game?
- adjust the algorithm to make it more efficient
  What is the algorithm?
  - when an elevator is idle, which floor should it go to? or should it just stay at the last floor it was at?
  - when several floors are pressed, which floor should the elevator go to first?
    the closest, the floor with the longest wait time, the floor with the most people waiting? or should it "plan" its route?
    - planning will be hard, as this would require the "elevator" to plan their route based of which floor want to go to which other floor,
      lets take this later
  - How can we actually "play" with the algorithm?
    - lets first in the POC just code the normal algorithm, and then later we can see if this is something that can be carried out into controls or if we need code
        
    

## rendering
- We want to visualize the wait time at floors when they are pressed

## requirements
- typescript
- canvas
    - use p5.js
- controllers on the page to adjust settings
    - lanes
    - floors
    - flow of people
    - time it takes to go from one floor to another
    - how many people each elevator can carry
## set values
- one elevator per lane
- there are no buttons inside the elevator
## factors
- ppl each elevator can carry
- time it takes to go from one floor to another
- if ppl come as a group, they will not split
  - maybe this can be a setting?
- group of ppl is harder?
## Things we need to keep track of
- number of lanes
- number of floors
- time since floor x was pressed
- how many times floor x was pressed
  once an elevator reaches floor x, it will reset the count and the time pressed on that floor

