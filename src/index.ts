// tslint:disable:no-implicit-dependencies
try { require('source-map-support').install(); } catch (e) { /* NOP */ }
import electron, { IpcMain, WebContents } from 'electron';
// tslint:enable:no-implicit-dependencies
import LiveServer from './LiveServer';
import SettingsRepo, { Settings } from './SettingsRepo';

class App {
  private server = new LiveServer();
  private updateServerTimer?: any;

  constructor(
    ipcMain: IpcMain,
    private webContents: WebContents,
    private settingsRepo: SettingsRepo,
    private settings: Settings,
  ) {
    this.handleError = this.handleError.bind(this);

    ipcMain.on('setRTMPPort', (_: any, value: number) => {
      this.settings.rtmpPort = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      this.delayUpdateServer();
      this.webContents.send('setSettings', this.settings);
    });
    ipcMain.on('setHTTPPort', (_: any, value: number) => {
      this.settings.httpPort = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      this.delayUpdateServer();
      this.webContents.send('setSettings', this.settings);
    });

    this.server.onUpdatedListeners.subscribe(() => {
      this.webContents.send('setListeners', this.server.listeners);
    });
  }

  private delayUpdateServer() {
    if (this.updateServerTimer != null) {
      clearTimeout(this.updateServerTimer);
    }
    this.updateServerTimer = setTimeout(
      async () => { await this.startServer(); },
      1000,
    );
  }

  async startServer() {
    if (this.settings.rtmpPort == null || this.settings.httpPort == null) {
      return;
    }
    const { error } = await this.server.setPort(
      this.settings.rtmpPort,
      this.settings.httpPort,
    );
    if (error != null) {
      this.webContents.send('error', error.reason);
    }
  }

  handleError(e: Error) {
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

  win.on('ready-to-show', () => {
    win.show();
    app.startServer().catch(handleError);
  });
  win.loadURL(`file://${__dirname}/local/index.html#${JSON.stringify(settings)}`);
}

function handleError(e: Error) {
  console.error(e.stack || e);
}

main().catch((e) => { console.error(e.stack || e); });
