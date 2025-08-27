#!/usr/bin/env node

const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

/**
 * Headless JavaScript Error Testing for Kids Rainbow Game
 * 
 * This script uses Puppeteer to run JavaScript tests in a headless Chrome browser
 * without requiring a full browser interface. It can detect:
 * - JavaScript runtime errors
 * - Console errors and warnings  
 * - Failed resource loads
 * - Kaplay.js initialization issues
 */

class HeadlessTestRunner {
  constructor() {
    this.server = null;
    this.browser = null;
    this.port = 8765; // Use different port than dev server
  }

  async startStaticServer() {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const projectRoot = path.join(__dirname, '..');
        let filePath = path.join(projectRoot, req.url === '/' ? 'index.html' : req.url);
        
        // Security check - ensure file is within project root
        if (!filePath.startsWith(projectRoot)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentTypes = {
              '.html': 'text/html',
              '.js': 'application/javascript',
              '.css': 'text/css',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.gif': 'image/gif'
            };
            
            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
            res.end(fs.readFileSync(filePath));
          } else {
            res.writeHead(404);
            res.end('Not Found');
          }
        } catch (err) {
          res.writeHead(500);
          res.end('Server Error');
        }
      });

      server.listen(this.port, '127.0.0.1', () => {
        console.log(`Test server running at http://127.0.0.1:${this.port}`);
        this.server = server;
        resolve();
      });

      server.on('error', reject);
    });
  }

  async launchBrowser() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });
  }

  async runTest(testFile, testName) {
    console.log(`\nRunning test: ${testName}`);
    console.log(`File: ${testFile}`);
    
    const page = await this.browser.newPage();
    const errors = [];
    const consoleMessages = [];

    // Capture console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      
      if (type === 'error') {
        errors.push(`Console Error: ${text}`);
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', error => {
      errors.push(`JavaScript Error: ${error.message}\nStack: ${error.stack}`);
    });

    // Capture failed resource loads
    page.on('requestfailed', request => {
      errors.push(`Failed to load: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
      // Navigate to test page
      const response = await page.goto(`http://127.0.0.1:${this.port}/${testFile}`, {
        waitUntil: 'networkidle0',
        timeout: 10000
      });

      if (!response.ok()) {
        errors.push(`HTTP Error: ${response.status()} - Failed to load ${testFile}`);
      }

      // Wait a bit for JavaScript to execute
      await page.waitForTimeout(2000);

      // Check if page has any specific error indicators
      const errorElements = await page.$$eval('[id*="error"], .error, .test-failed', 
        elements => elements.map(el => el.textContent)
      );
      
      errorElements.forEach(errorText => {
        if (errorText.trim()) {
          errors.push(`Page Error Element: ${errorText.trim()}`);
        }
      });

    } catch (error) {
      errors.push(`Test Execution Error: ${error.message}`);
    }

    await page.close();

    // Report results
    if (errors.length === 0) {
      console.log(`✅ PASS: ${testName} - No errors detected`);
    } else {
      console.log(`❌ FAIL: ${testName} - ${errors.length} error(s) detected:`);
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Show interesting console messages
    const importantMessages = consoleMessages.filter(msg => 
      msg.type !== 'log' || msg.text.includes('Error') || msg.text.includes('Warning')
    );
    
    if (importantMessages.length > 0) {
      console.log(`📝 Console Messages:`);
      importantMessages.forEach(msg => {
        console.log(`  [${msg.type.toUpperCase()}] ${msg.text}`);
      });
    }

    return errors.length === 0;
  }

  async runAllTests() {
    console.log('🚀 Starting Headless JavaScript Error Testing');
    
    try {
      await this.startStaticServer();
      await this.launchBrowser();

      const tests = [
        { file: 'test_errors.html', name: 'JavaScript Error Detection' },
        { file: 'test_red_level.html', name: 'Red Level Functionality' },
        { file: 'index.html', name: 'Main Game Initialization' }
      ];

      let passCount = 0;
      let totalTests = tests.length;

      for (const test of tests) {
        const passed = await this.runTest(test.file, test.name);
        if (passed) passCount++;
      }

      console.log('\n📊 Test Results Summary:');
      console.log(`Tests passed: ${passCount}/${totalTests}`);
      
      if (passCount === totalTests) {
        console.log('🎉 All tests passed!');
      } else {
        console.log('⚠️  Some tests failed - check errors above');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const runner = new HeadlessTestRunner();
  runner.runAllTests();
}

module.exports = HeadlessTestRunner;