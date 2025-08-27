# Headless JavaScript Testing for Kids Rainbow Game

## Overview

This directory contains automated testing tools that can detect JavaScript errors without requiring a full browser interface. The testing system uses **Puppeteer** with headless Chrome to run tests automatically, making it perfect for:

- Continuous Integration (CI) pipelines
- Automated error detection
- Docker-based testing environments
- Development workflow validation

## Why Headless Testing?

Traditional browser-based testing requires opening a full browser window and manually checking for errors. Our headless approach offers several advantages:

1. **No Browser UI Required** - Tests run completely in the background
2. **Automation-Friendly** - Can be integrated into build processes
3. **CI/CD Compatible** - Works in containerized environments without display
4. **Fast Execution** - No GUI rendering overhead
5. **Comprehensive Error Detection** - Catches errors that might be missed manually

## Testing Approach: Puppeteer + Headless Chrome

We chose **Puppeteer** over other alternatives because:

- **Full Browser Environment**: Supports Canvas, WebGL, and all web APIs needed by Kaplay.js
- **Real Chrome Engine**: Uses the same JavaScript engine as production browsers
- **Error Capture**: Can detect console errors, JavaScript exceptions, and resource loading failures
- **Docker Support**: Works well in containerized environments

### Alternatives Considered

1. **Node.js + jsdom**: Limited Canvas/WebGL support, not suitable for game engines
2. **Playwright**: Similar to Puppeteer but heavier, Puppeteer sufficient for our needs
3. **Headless Firefox**: Less reliable Canvas support than Chrome

## Installation

Install dependencies:

```bash
npm install
```

This will install Puppeteer, which automatically downloads a compatible Chrome binary.

## Usage

### Run All Tests

```bash
npm test
```

### Run Tests Manually

```bash
node tests/run-headless-tests.js
```

## What Gets Tested

The test runner automatically checks:

1. **test_errors.html** - JavaScript Error Detection
   - Validates error capture mechanisms
   - Tests Kaplay.js initialization
   - Checks for runtime errors

2. **test_red_level.html** - Red Level Functionality  
   - Tests game level loading
   - Validates sprite loading
   - Checks for game logic errors

3. **index.html** - Main Game Initialization
   - Tests main menu loading
   - Validates overall game startup
   - Checks for dependency issues

## Error Detection Capabilities

The headless testing system captures:

### JavaScript Runtime Errors
```
JavaScript Error: ReferenceError: findEmptyNear is not defined
Stack: at level.js:203:15
```

### Console Errors and Warnings
```
Console Error: Failed to load sprite: ./img/missing-sprite.png
```

### Resource Loading Failures
```
Failed to load: http://127.0.0.1:8765/img/missing.png - net::ERR_FILE_NOT_FOUND
```

### Page-Specific Error Indicators
```
Page Error Element: Game failed to initialize - check console
```

## Test Output Example

```bash
🚀 Starting Headless JavaScript Error Testing
Test server running at http://127.0.0.1:8765

Running test: JavaScript Error Detection
File: test_errors.html
✅ PASS: JavaScript Error Detection - No errors detected

Running test: Red Level Functionality
File: test_red_level.html
❌ FAIL: Red Level Functionality - 1 error(s) detected:
  1. JavaScript Error: ReferenceError: monster is not defined

📊 Test Results Summary:
Tests passed: 2/3
⚠️  Some tests failed - check errors above
```

## Docker Integration

### Basic Docker Testing

The existing Dockerfile can be extended for testing:

```dockerfile
# Multi-stage build for testing
FROM node:18-alpine as test
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm test

# Production stage
FROM nginx:alpine
COPY --from=test /app/*.html /app/*.js /app/*.css /usr/share/nginx/html/
COPY --from=test /app/img/ /usr/share/nginx/html/img/
```

### Automated Testing Docker Image

Create a dedicated testing image:

```dockerfile
FROM node:18-alpine

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip downloading Chrome (use system Chrome)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm install --only=prod

COPY . .
CMD ["npm", "test"]
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: JavaScript Error Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run headless tests
      run: npm test
```

### Docker Compose Testing

```yaml
version: '3.8'
services:
  test:
    build:
      context: .
      dockerfile: Dockerfile.test
    volumes:
      - .:/app
    command: npm test
```

## Development Workflow

1. **During Development**: Run `npm test` to check for JavaScript errors
2. **Before Commits**: Automated tests catch issues early
3. **In CI/CD**: Tests run automatically on every push
4. **Production Deployment**: Only deploy if all tests pass

## Adding New Tests

To add a new test file:

1. Create an HTML test file (e.g., `test_new_feature.html`)
2. Add it to the `tests` array in `run-headless-tests.js`:

```javascript
const tests = [
  { file: 'test_errors.html', name: 'JavaScript Error Detection' },
  { file: 'test_red_level.html', name: 'Red Level Functionality' },
  { file: 'test_new_feature.html', name: 'New Feature Test' }, // Add this
  { file: 'index.html', name: 'Main Game Initialization' }
];
```

## Troubleshooting

### Common Issues

**"Error: Failed to launch chrome" on Linux**
```bash
# Install Chrome dependencies
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

**"Tests timeout" Issues**
- Increase timeout in `run-headless-tests.js`
- Check if all required sprites/assets are present
- Verify network connectivity for CDN resources

**Docker Permission Issues**
```bash
# Run with proper permissions
docker run --cap-add=SYS_ADMIN your-test-image
```

## Benefits of This Approach

1. **Early Error Detection** - Catch JavaScript errors before they reach users
2. **Automated Validation** - No manual testing required for basic error checks
3. **CI/CD Integration** - Seamlessly integrates with deployment pipelines
4. **Development Speed** - Faster feedback loop during development
5. **Regression Prevention** - Automatically catches when new changes break existing functionality

## Future Enhancements

- Add performance testing (FPS monitoring)
- Visual regression testing (screenshot comparison)
- Network request mocking for offline testing
- Memory leak detection
- Cross-browser testing (Firefox, Safari)