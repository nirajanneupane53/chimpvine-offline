/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
const { spawn } = require('child_process');
import fs from 'fs';
const Store = require('electron-store');
const store = new Store();

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// let mainWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#ba73ff',
    icon: getAssetPath('icon.png'),

    webPreferences: {
      // devTools: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }

    //   if (!store.has('installationDate')) {
    //     const installationDate = new Date().toISOString();
    //     store.set('installationDate', installationDate);
    //   }
    // });

    //date subscription
    const subscriptionDate = new Date('2023-9-20').toISOString();
    store.set('subscriptionDate', subscriptionDate);

    // if (!store.has('subscriptionDate')) {
    //   const subscriptionDate = new Date('2023-06-01').toISOString();
    //   store.set('subscriptionDate', subscriptionDate);
    // }
  });

  // mainWindow.on('closed', () => {
  //   mainWindow = null;
  // });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  ipcMain.on('date-data', async (event, arg) => {
    // console.log(store.get('installationDate'));
    let data = store.get('subscriptionDate');
    event.reply('date-data', data);
  });

  ipcMain.on('Screen-data', async (event, arg) => {
    // for loading games
    if (arg.event == 'GamesOpen') {
      const exePath = app.isPackaged
        ? path.join(__dirname, '../../../', arg.link)
        : path.join(__dirname, '../../', arg.link);

      console.log(exePath);
      event.reply('Screen-data', exePath);

      var fun = function () {
        const child = spawn(exePath, [
          /* arguments */
        ]);

        child.on('error', (err: any) => {
          console.error('Failed to start child process.', err);
        });

        // Listen for the 'exit' event
        child.on('exit', (code: any) => {
          console.log(`Child process exited with code ${code}`);
        });
      };
      fun();
    }

    //for loading screendata like games, interactive content, etc.

    if (arg.event == 'ReadJson') {
      const dataFilePath = app.isPackaged
        ? path.join(__dirname, '../../../assets/data/', arg.link + '.json')
        : path.join(__dirname, '../../assets/data/', arg.link + '.json');

      // path.join(__dirname, '../data/', arg.link + '.json');
      // const dataFilePath = path.join(__dirname);

      console.log(dataFilePath);
      // event.reply('Screen-data', dataFilePath);
      let data = [];
      try {
        const dataFile = fs.readFileSync(dataFilePath, 'utf8');
        data = JSON.parse(dataFile);
      } catch (error) {
        console.error(error);
        return data;
      }

      event.reply('Screen-data', data);
      // event.reply('Screen-data', dataFilePath);
    }

    //to open interactive content
    if (arg.event == 'H5pOpen') {
      // let child: BrowserWindow | null = null;

      const exePath = app.isPackaged
        ? path.join(__dirname, '../../../', arg.link)
        : path.join(__dirname, '../../', arg.link);

      console.log(exePath);

      // shell.openExternal(`file://${exePath}`);
      // let myWindow: BrowserWindow | null = null;
      // if (child) {
      //   // child.close();
      // }

      // child = new BrowserWindow({
      //   // fullscreen: true,

      //   webPreferences: {
      //     // fullscreen: true,
      //     nodeIntegration: true,
      //     contextIsolation: false,
      //     javascript: true,
      //     webSecurity: false,
      //     allowRunningInsecureContent: true,
      //   },
      // });
      let child: BrowserWindow | null = null;
      child = new BrowserWindow({
        // fullscreen: true,
        parent: mainWindow,
        modal: true,
        webPreferences: {
          // fullscreen: true,
          nodeIntegration: true,
          contextIsolation: false,
          javascript: true,
          webSecurity: false,
          allowRunningInsecureContent: true,
        },
      });
      child.setMenuBarVisibility(false);
      child.loadFile(exePath);

      child.on('ready-to-show', () => {
        if (!child) {
          throw new Error('"mainWindow" is not defined');
        }
        if (process.env.START_MINIMIZED) {
          child.maximize();
        } else {
          child.show();
        }
      });
    }

    if (arg.event == 'close') {
      app.quit();
    }
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch(console.log);
