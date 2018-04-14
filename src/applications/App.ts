// tslint:disable-next-line:no-implicit-dependencies
import { IpcMain, WebContents } from 'electron';
import { Settings } from '../commons/types';
import Chat from '../domains/Chat';
import SignalingServer from '../domains/SignalingServer';
import ServerUnion from '../infrastructures/ServerUnion';
import SettingsRepo from '../infrastructures/SettingsRepo';

export default class App {
  private readonly chat = new Chat();
  readonly serverUnion = new ServerUnion(this.chat, 'HitoriLive');
  private readonly signalingServer = new SignalingServer('ws://127.0.0.1:17144/live/.flv');

  constructor(
    ipcMain: IpcMain,
    private webContents: WebContents,
    private settingsRepo: SettingsRepo,
    private settings: Settings,
  ) {
    this.handleError = this.handleError.bind(this);

    this.signalingServer = new SignalingServer(
      `ws://127.0.0.1:${settings.httpPort}/live/.flv`,
    );

    this.listenServerEvents(this.serverUnion);
    this.listenGUIEvents(ipcMain);

    this.chat.onMessage.subscribe((message) => {
      this.webContents.send('addMessage', message);
    });
  }

  isRunning() {
    return this.serverUnion.isRunning();
  }

  async close() {
    await this.serverUnion.closeServer(this.settings.useUpnp);
  }

  private listenServerEvents(serverUnion: ServerUnion) {
    serverUnion.error.subscribe(({ reason }) => {
      if (this.webContents.isDestroyed()) {
        console.error(new Error(reason));
        return;
      }
      this.webContents.send('error', reason);
    });
    serverUnion.onUpdateListeners.subscribe(() => {
      if (this.webContents.isDestroyed()) {
        return;
      }
      this.webContents.send('setListeners', serverUnion.getListeners());
    });
    serverUnion.onJoin.subscribe(async (socket) => {
      try {
        await this.signalingServer.join(socket);
      } catch (e) {
        socket.close();
        console.error(e.stack || e);
      }
    });
  }

  private listenGUIEvents(ipcMain: IpcMain) {
    ipcMain.on('setRTMPPort', (_: any, value: number) => {
      this.settings.rtmpPort = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      this.serverUnion.delayUpdateServer({ ...this.settings });
      this.webContents.send('setSettings', this.settings);
    });
    ipcMain.on('setHTTPPort', (_: any, value: number) => {
      this.settings.httpPort = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      this.signalingServer.mediaURL = `ws://127.0.0.1:${this.settings.httpPort}/live/.flv`;
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
  }

  private handleError(e: Error) {
    console.error(e.stack || e);
    this.webContents.send('error', e.message || e);
  }
}
