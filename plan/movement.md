
# Movement

When not in the menu, the player can move around the infinite world in 4 directions: up, down, left right.

The player only ever stops on a grid square. Inbetween squares the movement is smooth but does not stop.

When the player is moving in a direction, use the correct character image:
- up: char-back
- down: char-front
- right: char-right
- left: char-right but flipped

The screen scrolls with the player whenever they get within 40% of the edge. In the middle 20% rectangle they can move without scrolling.

