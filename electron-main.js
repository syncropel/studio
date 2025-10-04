const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");

let cxServerProcess = null;

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "electron-preload.js"),
    },
  });

  // Determine the URL to load
  const startUrl =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, "out/index.html")}`;
  console.log(`[Electron] Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  // Open the DevTools automatically in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// --- CX-SERVER LIFECYCLE MANAGEMENT ---

function startCxServer() {
  const isDev = !app.isPackaged;
  // In a packaged app, the server executable will be in the 'resources' folder.
  // In development, we assume `cx` is in the system PATH.
  const command = isDev ? "cx" : path.join(process.resourcesPath, "cx-server");
  const args = ["serve"];

  console.log(
    `[Electron] Starting cx-server with command: ${command} ${args.join(" ")}`
  );

  cxServerProcess = spawn(command, args);

  cxServerProcess.stdout.on("data", (data) => {
    console.log(`[cx-server|stdout]: ${data}`);
  });
  cxServerProcess.stderr.on("data", (data) => {
    console.error(`[cx-server|stderr]: ${data}`);
  });
  cxServerProcess.on("close", (code) => {
    console.log(`[cx-server] process exited with code ${code}`);
  });
}

function stopCxServer() {
  if (cxServerProcess) {
    console.log("[Electron] Stopping cx-server...");
    // Use 'kill' which sends SIGTERM by default, allowing graceful shutdown.
    cxServerProcess.kill();
    cxServerProcess = null;
  }
}

// --- ELECTRON APP LIFECYCLE ---

app.whenReady().then(() => {
  startCxServer();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // On macOS, it's common for applications to stay active until the user quits explicitly.
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Make sure we clean up the Python server when the app quits.
app.on("will-quit", () => {
  stopCxServer();
});
