"""
Simple 2D game starter using Pygame with a scrolling world.

How to run:
  1) Install dependencies: pip install pygame
  2) Run the game: python main.py

Move with arrow keys or WASD. The camera follows the character; press Esc to quit.
"""

import sys

try:
    import pygame
except ImportError:
    print("This starter requires pygame. Install it with: pip install pygame")
    sys.exit(1)

# Window (screen) configuration
WIDTH, HEIGHT = 1600, 1200
TITLE = "Kids Rainbow - Starter (Pygame)"
BG_COLOR = (30, 30, 30)  # dark background
FPS = 60

# Grid configuration
GRID_SIZE = 80
GRID_COLOR = (80, 80, 80)  # gray lines

# World configuration (bigger than the screen so we can scroll)
WORLD_COLS = 50
WORLD_ROWS = 40
WORLD_WIDTH = WORLD_COLS * GRID_SIZE
WORLD_HEIGHT = WORLD_ROWS * GRID_SIZE


def draw_grid(surface, cam_x: int, cam_y: int, cell_size: int = GRID_SIZE, color: tuple = GRID_COLOR) -> None:
    """Draw a grid in world space, offset by the camera so it scrolls."""
    # First visible vertical grid line on screen based on camera
    start_x = -(cam_x % cell_size)
    x = start_x
    while x <= WIDTH:
        pygame.draw.line(surface, color, (x, 0), (x, HEIGHT))
        x += cell_size

    # First visible horizontal grid line on screen based on camera
    start_y = -(cam_y % cell_size)
    y = start_y
    while y <= HEIGHT:
        pygame.draw.line(surface, color, (0, y), (WIDTH, y))
        y += cell_size


def main() -> None:
    pygame.init()

    # Create the window
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption(TITLE)

    clock = pygame.time.Clock()

    # Player configuration
    PLAYER_SIZE = GRID_SIZE
    PLAYER_COLOR = (220, 200, 60)  # yellowish block
    PLAYER_SPEED = 375  # pixels per second (50% faster)

    # Create the player in the center of the WORLD (world coordinates)
    player_rect = pygame.Rect(
        (WORLD_WIDTH - PLAYER_SIZE) // 2,
        (WORLD_HEIGHT - PLAYER_SIZE) // 2,
        PLAYER_SIZE,
        PLAYER_SIZE,
    )

    # Snap initial position to the grid (world coordinates)
    player_rect.x = (player_rect.x // GRID_SIZE) * GRID_SIZE
    player_rect.y = (player_rect.y // GRID_SIZE) * GRID_SIZE

    # Use float positions for smooth interpolation (world coordinates)
    current_x = float(player_rect.x)
    current_y = float(player_rect.y)
    target_x = current_x
    target_y = current_y
    moving = False  # whether we're currently animating toward a target cell

    running = True

    # Initialize camera to center on player at start, then maintain with dead-zone scrolling
    cam_x = max(0, min(player_rect.centerx - WIDTH // 2, max(0, WORLD_WIDTH - WIDTH)))
    cam_y = max(0, min(player_rect.centery - HEIGHT // 2, max(0, WORLD_HEIGHT - HEIGHT)))

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
                # Compute potential target while respecting WORLD bounds
                proposed_x = current_x + dir_x * GRID_SIZE
                proposed_y = current_y + dir_y * GRID_SIZE

                # Ensure target stays within world bounds (player size is GRID_SIZE)
                min_x = 0
                min_y = 0
                max_x = WORLD_WIDTH - PLAYER_SIZE
                max_y = WORLD_HEIGHT - PLAYER_SIZE

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

        # Update rect from float position for rendering (world coordinates)
        player_rect.x = int(round(current_x))
        player_rect.y = int(round(current_y))

        # Camera with central dead zone (20% of screen). Only scroll when player exits this zone.
        # Compute player's position on screen using current camera
        screen_cx = player_rect.centerx - cam_x
        screen_cy = player_rect.centery - cam_y

        # Dead zone dimensions centered on the screen
        dz_w = WIDTH * 0.2
        dz_h = HEIGHT * 0.2
        dz_left = (WIDTH - dz_w) / 2.0
        dz_right = dz_left + dz_w
        dz_top = (HEIGHT - dz_h) / 2.0
        dz_bottom = dz_top + dz_h

        # Adjust camera only if player is outside the dead zone
        if screen_cx < dz_left:
            cam_x -= int(dz_left - screen_cx)
        elif screen_cx > dz_right:
            cam_x += int(screen_cx - dz_right)

        if screen_cy < dz_top:
            cam_y -= int(dz_top - screen_cy)
        elif screen_cy > dz_bottom:
            cam_y += int(screen_cy - dz_bottom)

        # Clamp camera to world bounds
        cam_x = max(0, min(cam_x, max(0, WORLD_WIDTH - WIDTH)))
        cam_y = max(0, min(cam_y, max(0, WORLD_HEIGHT - HEIGHT)))

        # Draw
        screen.fill(BG_COLOR)
        draw_grid(screen, cam_x, cam_y)

        # Draw the player relative to the camera (screen-space rect)
        screen_player_rect = player_rect.move(-cam_x, -cam_y)
        pygame.draw.rect(screen, PLAYER_COLOR, screen_player_rect)

        # Present the frame
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
