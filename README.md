# Kaboom.js Minimal Template

This repository provides a minimal template for building a Kaboom.js game that runs directly in the browser. It includes a full-screen game canvas, basic Kaboom initialization, and an example of loading a local sprite.

## What’s included
- `index.html`: Loads Kaboom via CDN (no bundler needed) and initializes a full-screen game window.
- `img/`: Sample images you can use to quickly test sprites.

## Quick start

### Option A: Open directly in a browser
1. Double-click `index.html` (or open it in your browser).
2. You should see a black game window and a character sprite centered on screen.

> Note: Some browsers restrict features when opening files via `file://`. If something doesn’t display, try Option B.

### Option B: Serve locally (recommended)
Use any static file server. Examples:

- Using Python 3 (built-in):
  ```bash
  python3 -m http.server 5173
  ```
  Then open http://localhost:5173 in your browser.

- Using Node (npx serve):
  ```bash
  npx serve .
  ```

## Customize
- Replace the loaded sprite path in `index.html` with your own:
  ```js
  loadSprite('hero', 'img/char-front.png');
  ```
- Remove the demo sprite and keep a blank canvas by deleting or commenting the `loadSprite(...)` and the `add([...])` block.
- Adjust the initial resolution by changing `width`/`height` in the Kaboom initialization. The template already listens to window resize events to keep the canvas full-screen.

## Kaboom version
This template pins Kaboom via CDN to a stable version to avoid breaking changes:
```
https://unpkg.com/kaboom@3001.0.0/dist/kaboom.mjs?module
```
Note: the `?module` flag ensures the CDN serves the file with the proper MIME type (`application/javascript`) for ESM imports, avoiding browser blocks due to `text/plain`.
You can update the version in `index.html` as needed.

## License
Use this template freely for your projects.
