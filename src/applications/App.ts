// tslint:disable-next-line:no-implicit-dependencies
import { IpcMain, WebContents } from 'electron';
import { Settings } from '../commons/types';
import Chat from '../domains/Chat';
import ServerUnion from '../infrastructures/ServerUnion';
import SettingsRepo from '../infrastructures/SettingsRepo';

export default class App {
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
    ipcMain.on('addMessage', (_: any, value: { id: string; message: string }) => {
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
