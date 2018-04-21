// tslint:disable-next-line:no-implicit-dependencies
import { IpcMain, WebContents } from 'electron';
import { Settings } from '../commons/types';
import SignalingServer from '../domains/SignalingServer';
import ServerUnion from '../infrastructures/ServerUnion';
import SettingsRepo from '../infrastructures/SettingsRepo';
import ChatDomain from '../libraries/chat/ChatDomain';
import ChatServer from '../libraries/chat/ChatServer';

export default class App {
  private readonly chat = new ChatDomain();
  readonly serverUnion = new ServerUnion(new ChatServer(this.chat), 'HitoriLive');
  private readonly signalingServer = new SignalingServer('/live/.flv');

  constructor(
    ipcMain: IpcMain,
    private webContents: WebContents,
    private settingsRepo: SettingsRepo,
    private settings: Settings,
  ) {
    this.handleError = this.handleError.bind(this);

    this.listenServerEvents(this.serverUnion);
    this.listenSignalingServerEvents(this.signalingServer);
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
    serverUnion.onJoin.subscribe(async (socket) => {
      try {
        await this.signalingServer.join(socket);
      } catch (e) {
        socket.close();
        console.error(e.stack || e);
      }
    });
  }

  private listenSignalingServerEvents(signalingServer: SignalingServer) {
    signalingServer.onListenerUpdate.subscribe(({ count }) => {
      if (this.webContents.isDestroyed()) {
        return;
      }
      this.webContents.send('setListeners', count);
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
    ipcMain.on('setEnableP2PStreamRelay', (_: any, value: boolean) => {
      this.settings.enableP2PStreamRelay = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      updateServerDirectlyConnectionLimit(this.signalingServer, this.settings);
      this.webContents.send('setSettings', this.settings);
    });
    ipcMain.on('setDirectlyConnectionLimit', (_: any, value: number) => {
      this.settings.directlyConnectionLimit = value;
      this.settingsRepo.set(this.settings).catch(this.handleError);
      updateServerDirectlyConnectionLimit(this.signalingServer, this.settings);
      this.webContents.send('setSettings', this.settings);
    });
  }

  private handleError(e: Error) {
    console.error(e.stack || e);
    this.webContents.send('error', e.message || e);
  }
}

function updateServerDirectlyConnectionLimit(
  signalingServer: SignalingServer,
  settings: Settings,
) {
  if (settings.enableP2PStreamRelay) {
    signalingServer.setDirectlyConnectionLimit(settings.directlyConnectionLimit);
  } else {
    signalingServer.setDirectlyConnectionLimit(Infinity);
  }
}
