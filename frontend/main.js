const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let backendProcess = null;
let window;
let tray;
let isQuitting = false;

function createWindow() {
    window = new BrowserWindow({
        width: 550,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    window.loadFile('login.html');

    window.on('close', function (event) {
        if (!isQuitting) {
            event.preventDefault();
            window.hide();
            event.returnValue = false;
        }
    });
}

function startBackend() {
    const backendExe = path.join(process.resourcesPath, 'backend.exe');
    backendProcess = spawn(backendExe, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
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

ipcMain.on('exit-app', () => {
    isQuitting = true;
    stopBackend();
    app.quit();
});

app.whenReady().then(() => {
    createWindow();

    tray = new Tray(path.join(__dirname, 'logo.png'));
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: 'Show App', click: () => window.show()
        },
        {
            label: 'Quit', click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]));

    startBackend();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    isQuitting = true;
    stopBackend();
    app.quit();
});
