const { app, BrowserWindow, ipcMain, Tray, Menu, Notification} = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

let backendProcess = null;
let window;
let tray;
let isQuitting = false;
let userToken = null;

function createWindow() {
    window = new BrowserWindow({
        width: 550,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    window.loadFile(path.join(__dirname, 'login.html'));
    window.setTitle('ClipVault - Secure Clipboard Manager');

    window.on('close', function (event) {
        if (!isQuitting) {
            event.preventDefault();
            window.hide();
            event.returnValue = false;
        }
    });
}

function startBackend() {
    const isPackaged = app.isPackaged;
    const logPath = path.join(__dirname, '..', 'backend.log');
    const log = (msg) => {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        try { fs.appendFileSync(logPath, line); } catch {}
        console.log(msg);
    };

    if (isPackaged) {
        const backendExe = path.join(process.resourcesPath, 'backend.exe');
        backendProcess = spawn(backendExe, [], {
            detached: false,
            stdio: 'pipe',
            windowsHide: true,
            env: { ...process.env, CLIPVAULT_DISABLE_CLIPBOARD: '0' },
        });
    } else {
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

ipcMain.on('exit-app', () => {
    stopBackend()
    app.quit()
})

// Receive JWT token from renderer
ipcMain.on('auth-token', (event, token) => {
    userToken = token;
    // start clipboard watcher once we have token
    startClipboardWatcher();
})

// Watch clipboard for new copies and show notification
let clipboardWatcherInterval = null;
let lastClipboardContent = null;

function startClipboardWatcher() {
    if (!userToken) return;

    if (clipboardWatcherInterval) clearInterval(clipboardWatcherInterval);

    clipboardWatcherInterval = setInterval(async () => {
        try {
            const req = http.request({
                host: '127.0.0.1',
                port: 8000,
                path: '/clipboard/current',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${userToken}` },
                timeout: 1000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.content && json.content !== lastClipboardContent) {
                            lastClipboardContent = json.content;
                            
                            new Notification({
                                title: 'Clipboard Updated',
                                body: 'New clipboard entry copied!',
                                silent: true
                            }).show();
                        }
                    } catch (e) {
                        console.error('Clipboard watcher error parsing JSON', e);
                    }
                });
            });
            req.on('error', (err) => {
                console.error('Clipboard watcher request error', err);
            });
            req.end();
        } catch (e) {
            console.error('Clipboard watcher error', e);
        }
    }, 1000);
}

app.whenReady().then(async () => {
    createWindow();

    tray = new Tray(path.join(__dirname, 'logo.png'));
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show App', click: () => window.show() },
        { label: 'Quit', click: () => {
            isQuitting = true;
            stopBackend();
            app.quit();
        }}
    ]));

    // Ensure backend is running
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

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    isQuitting = true;
    stopBackend();
    app.quit();
});