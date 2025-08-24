
Level layout
* The red level is 70 x 25 cells with a wall around.
* The start is at the left top, and the finish with the red monster at the left bottom.
* Player has to go all the way to the right to reach red monster.
* Player can see the red monster initially, but cannot reach it.

Red monster (red-monster.png)
* Takes 3x3 cells
* Walks several cells every few seconds (not jumps), but stays within 15 steps of the bottom left.
* The red monster can shoot a round red ball when it's not moving. It only does so if the player is within 12 cells.
* The red balls that the red monster shoots disappear if they hit a wall or dynamic obstacle.
* If they hit the player, the player gets hurt (loses 1 life)
* Balls stop shooting when the monster dies

It only shoots right, left, up or down, whichever one is closest to player direction.

There are dynamic obstacle blocks.
* They move predictably left-right or up-down. They always only turn around when reaching a wall.
* If they touch a player, the player gets pushed in the same direction as the block
* If the player gets caught between a block and a wall or another block, the player gets hurt (lose 1 life)
* If a dynamic obstacle touches another one, they bounce alog grid boundaries
* Dynamic obstacles cannot enter walls, they always reflect at cell boundaries.

