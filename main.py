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
    running = True

    while running:
        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        # Draw
        screen.fill(BG_COLOR)
        draw_grid(screen)

        # Present the frame
        pygame.display.flip()

        # Cap the frame rate
        clock.tick(FPS)

    pygame.quit()


if __name__ == "__main__":
    main()
