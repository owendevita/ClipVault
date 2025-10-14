const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('Electron app smoke test', () => {
  jest.setTimeout(15000); 

  const appPath = path.join(__dirname, '../out/ClipVault-win32-x64/ClipVault.exe');
  const isCI = (process.env.CI || '').toString().toLowerCase() === 'true' || !!process.env.GITHUB_ACTIONS;
  const hasBinary = fs.existsSync(appPath);

  const maybeTest = (isCI || !hasBinary) ? test.skip : test;

  maybeTest('launches without immediate errors', done => {

    const child = spawn(appPath, [], { stdio: 'pipe' });

    let hasError = false;
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', data => {
      stdoutData += data.toString();
    });

    // Mark any stderr as a fail
    child.stderr.on('data', data => {
      stderrData += data.toString();
      hasError = true;
      console.error(`stderr: ${data.toString()}`);
    });

    // If the process exits too early then fail
    child.on('exit', code => {
      if (!stdoutData && !stderrData && code !== 0) {
        hasError = true;
        console.error(`App exited prematurely with code ${code}`);
      }
    });

    setTimeout(() => {
      child.kill(); // stop the app to avoid hanging Jest
      expect(hasError).toBe(false); 
      done();
    }, 5000); 
  });
});
