"""
Simple 2D game starter using Pygame.

How to run:
  1) Install dependencies: pip install pygame
  2) Run the game: python main.py

This opens an empty window with a dark background. Close the window or press Esc to quit.
"""

import sys

try:
    import pygame
except ImportError:
    print("This starter requires pygame. Install it with: pip install pygame")
    sys.exit(1)

# Window configuration
WIDTH, HEIGHT = 800, 600
TITLE = "Kids Rainbow - Starter (Pygame)"
BG_COLOR = (30, 30, 30)  # dark background
FPS = 60

# Grid configuration
GRID_SIZE = 40
GRID_COLOR = (80, 80, 80)  # gray lines


def draw_grid(surface, cell_size: int = GRID_SIZE, color: tuple = GRID_COLOR) -> None:
    # Vertical lines
    for x in range(0, WIDTH, cell_size):
        pygame.draw.line(surface, color, (x, 0), (x, HEIGHT))
    # Horizontal lines
    for y in range(0, HEIGHT, cell_size):
        pygame.draw.line(surface, color, (0, y), (WIDTH, y))


def main() -> None:
    pygame.init()

    # Create the window
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption(TITLE)

    clock = pygame.time.Clock()

    # Player configuration
    PLAYER_SIZE = GRID_SIZE
    PLAYER_COLOR = (220, 200, 60)  # yellowish block
    PLAYER_SPEED = 250  # pixels per second

    # Create the player rectangle centered in the window
    player_rect = pygame.Rect(
        (WIDTH - PLAYER_SIZE) // 2,
        (HEIGHT - PLAYER_SIZE) // 2,
        PLAYER_SIZE,
        PLAYER_SIZE,
    )

    # Snap initial position to the grid
    player_rect.x = (player_rect.x // GRID_SIZE) * GRID_SIZE
    player_rect.y = (player_rect.y // GRID_SIZE) * GRID_SIZE

    # Use float positions for smooth interpolation
    current_x = float(player_rect.x)
    current_y = float(player_rect.y)
    target_x = current_x
    target_y = current_y
    moving = False  # whether we're currently animating toward a target cell

    running = True

    while running:
        # Time since last frame (in seconds) for framerate-independent movement
        dt = clock.tick(FPS) / 1000.0

        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        # Input handling for grid-stepped movement
        keys = pygame.key.get_pressed()

        # If not currently moving, decide on next grid step based on input
        if not moving:
            dir_x = 0
            dir_y = 0
            if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                dir_x = -1
            elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                dir_x = 1

            # Only choose vertical if no horizontal was chosen to avoid diagonal moves
            if dir_x == 0:
                if keys[pygame.K_UP] or keys[pygame.K_w]:
                    dir_y = -1
                elif keys[pygame.K_DOWN] or keys[pygame.K_s]:
                    dir_y = 1

            if dir_x != 0 or dir_y != 0:
                # Compute potential target while respecting bounds
                proposed_x = current_x + dir_x * GRID_SIZE
                proposed_y = current_y + dir_y * GRID_SIZE

                # Ensure target stays within bounds (player size is GRID_SIZE)
                min_x = 0
                min_y = 0
                max_x = WIDTH - PLAYER_SIZE
                max_y = HEIGHT - PLAYER_SIZE

                if min_x <= proposed_x <= max_x and min_y <= proposed_y <= max_y:
                    target_x = proposed_x
                    target_y = proposed_y
                    moving = True

        # If moving, interpolate toward the target smoothly at PLAYER_SPEED
        if moving:
            step = PLAYER_SPEED * dt
            # Movement is axis-aligned; move along one axis at a time
            if current_x != target_x:
                dx = target_x - current_x
                move_x = max(-step, min(step, dx))  # clamp to not overshoot
                current_x += move_x
                # Snap if we're within a tiny epsilon to avoid float drift
                if abs(target_x - current_x) <= 0.001:
                    current_x = target_x
            elif current_y != target_y:
                dy = target_y - current_y
                move_y = max(-step, min(step, dy))
                current_y += move_y
                if abs(target_y - current_y) <= 0.001:
                    current_y = target_y

            # Arrived at target? Stop moving; holding keys will trigger the next step next frame
            if abs(current_x - target_x) <= 0.001 and abs(current_y - target_y) <= 0.001:
                current_x = target_x
                current_y = target_y
                moving = False

        # Update rect from float position for rendering
        player_rect.x = int(round(current_x))
        player_rect.y = int(round(current_y))

        # Draw
        screen.fill(BG_COLOR)
        draw_grid(screen)
        pygame.draw.rect(screen, PLAYER_COLOR, player_rect)

        # Present the frame
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
