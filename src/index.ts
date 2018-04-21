// tslint:disable:no-implicit-dependencies
try { require('source-map-support').install(); } catch (e) { /* NOP */ }
import electron from 'electron';
// tslint:enable:no-implicit-dependencies
import App from './applications/App';
import SettingsRepo from './infrastructures/SettingsRepo';

process.on('unhandledRejection', console.dir);

async function main() {
  await new Promise((resolve, reject) => electron.app.once('ready', resolve));

  electron.app.on('window-all-closed', electron.app.quit.bind(electron.app));
  const win = new electron.BrowserWindow({
    width: 640,
    height: 360,
    resizable: true,
    show: false,
  });

  const settingsRepo = new SettingsRepo();
  const settings = await settingsRepo.get();
  const app = new App(
    electron.ipcMain,
    win.webContents,
    settingsRepo,
    settings,
  );
  electron.app.on('before-quit', async (e) => {
    if (!app.isRunning()) {
      return;
    }
    e.preventDefault();
    try {
      await app.close();
    } catch (err) {
      console.error(err.stack || err);
    } finally {
      electron.app.quit();
    }
  });

  win.on('ready-to-show', () => {
    win.show();
    app.serverUnion.startServer({ ...settings }).catch(handleError);
  });
  win.loadURL(`file://${__dirname}/local/index.html#${JSON.stringify(settings)}`);
}

function handleError(e: Error) {
  console.error(e.stack || e);
}

main().catch((e) => { console.error(e.stack || e); });
