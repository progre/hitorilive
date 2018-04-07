// tslint:disable:no-implicit-dependencies
try { require('source-map-support').install(); } catch (e) { /* NOP */ }
import electron, { IpcMain, WebContents } from 'electron';
// tslint:enable:no-implicit-dependencies
import Chat from './domains/Chat';
import ServerUnion from './infrastructures/ServerUnion';
import SettingsRepo from './infrastructures/SettingsRepo';
import { Settings } from './types';

class App {
  private chat = new Chat();
  serverUnion = new ServerUnion(this.chat, 'HitoriLive');

  constructor(
    ipcMain: IpcMain,
    private webContents: WebContents,
    private settingsRepo: SettingsRepo,
    private settings: Settings,
  ) {
    this.handleError = this.handleError.bind(this);

    this.serverUnion.error.subscribe(({ reason }) => {
      this.webContents.send('error', reason);
    });

    ipcMain.on('setRTMPPort', (_: any, value: number) => {
      this.settings.rtmpPort = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      this.serverUnion.delayUpdateServer({ ...this.settings });
      this.webContents.send('setSettings', this.settings);
    });
    ipcMain.on('setHTTPPort', (_: any, value: number) => {
      this.settings.httpPort = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      this.serverUnion.delayUpdateServer({ ...this.settings });
      this.webContents.send('setSettings', this.settings);
    });
    ipcMain.on('setUseUpnpPortMapping', (_: any, value: boolean) => {
      this.settings.useUpnp = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);

      this.webContents.send('setSettings', this.settings);
    });
    ipcMain.on('addMessage', (_: any, value: { id: string, message: string }) => {
      this.chat.addMessage(value);
    });

    this.chat.onMessage.subscribe((message) => {
      this.webContents.send('addMessage', message);
    });

    this.serverUnion.onUpdateListeners.subscribe(() => {
      this.webContents.send('setListeners', this.serverUnion.getListeners());
    });
  }

  isRunning() {
    return this.serverUnion.isRunning();
  }

  async close() {
    await this.serverUnion.closeServer(this.settings.useUpnp);
  }

  private handleError(e: Error) {
    console.error(e.stack || e);
    this.webContents.send('error', e.message || e);
  }
}

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
