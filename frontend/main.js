const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process');
const { exec } = require('child_process');
const fs = require('fs');
const http = require('http');

let backendProcess = null; 

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 550,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    // Start with login page
    mainWindow.loadFile(path.join(__dirname, 'login.html'))
    
    // Set window title
    mainWindow.setTitle('ClipVault - Secure Clipboard Manager')
}

function startBackend() {
    // Use the secure backend batch script
    const isPackaged = app.isPackaged;
    const logPath = path.join(__dirname, '..', 'backend.log');
    const log = (msg) => {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        try { fs.appendFileSync(logPath, line); } catch {}
        console.log(msg);
    };
    
    if (isPackaged) {
        // In production, look for the backend executable
        const backendExe = path.join(process.resourcesPath, 'backend.exe');
        backendProcess = spawn(backendExe, [], {
            detached: false,
            stdio: 'pipe',
            windowsHide: true,
            env: { ...process.env, CLIPVAULT_DISABLE_CLIPBOARD: process.env.CLIPVAULT_DISABLE_CLIPBOARD ?? '1' },
        });
    } else {
        // In development, use direct python execution
        const pythonExe = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
        const mainPy = path.join(__dirname, '..', 'backend', 'main.py');
        log(`Starting secure backend with Python: ${pythonExe} ${mainPy}`);
        
        backendProcess = spawn(pythonExe, [mainPy], {
            detached: false,
            stdio: 'pipe',
            windowsHide: true,
            cwd: path.join(__dirname, '..', 'backend'),
            env: { ...process.env, CLIPVAULT_DISABLE_CLIPBOARD: process.env.CLIPVAULT_DISABLE_CLIPBOARD ?? '1' },
        });
    }

    if (backendProcess && backendProcess.stdout) {
        backendProcess.stdout.on('data', (d) => log(`[backend stdout] ${d}`));
    }
    if (backendProcess && backendProcess.stderr) {
        backendProcess.stderr.on('data', (d) => log(`[backend stderr] ${d}`));
    }
    backendProcess.on('exit', (code, signal) => {
        log(`Backend process exited code=${code} signal=${signal}`);
    });

    log(`Secure ClipVault backend started with PID: ${backendProcess?.pid}`);
}

function stopBackend() {
    if (backendProcess) {
        console.log('INFO: Stopping backend...');
        exec(`taskkill /PID ${backendProcess.pid} /T /F`, (err) => {
      if (err) console.error('Failed to kill backend:', err);
    });
        backendProcess = null;
    
    }
}

function isBackendUp(timeoutMs = 1000) {
    return new Promise((resolve) => {
        const req = http.request({
            host: '127.0.0.1',
            port: 8000,
            // Use lightweight healthz to avoid heavy checks that can fail intermittently
            path: '/healthz',
            method: 'GET',
            timeout: timeoutMs,
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

// Handle exit app request from renderer
ipcMain.on('exit-app', () => {
    stopBackend()
    app.quit()
})



app.whenReady().then(async () => {
    createWindow()

    // Ensure backend is running; start only if not already up to avoid conflicts
    let up = await isBackendUp(800);
    if (!up) {
        console.log('Backend not responding on 127.0.0.1:8000, starting it now...');
        startBackend();
        // wait for readiness
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 400));
            up = await isBackendUp(600);
            if (up) break;
        }
        console.log(`Backend ready: ${up}`);
    } else {
        console.log('Backend already running at 127.0.0.1:8000');
    }

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    stopBackend()
    app.quit()
})