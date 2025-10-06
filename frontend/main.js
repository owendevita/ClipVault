const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process');
const { exec } = require('child_process');

let backendProcess = null; 

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 550,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })


    mainWindow.loadFile('home.html')
}

function startBackend() {
  const backendExe = path.join(process.resourcesPath, 'backend.exe');

  backendProcess = spawn(backendExe, [], {
    detached: true, 
    stdio: 'ignore',
    windowsHide: true,
    
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

// Handle exit app request from renderer
ipcMain.on('exit-app', () => {
    stopBackend()
    app.quit()
})



app.whenReady().then(() => {
    createWindow()
    
    startBackend();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    stopBackend()
    app.quit()
})