import { Subject } from 'rxjs';
import Chat from '../domains/Chat';
import { Settings } from '../types';
import HTTPServer from './HTTPServer';
import MediaServer, { PortError } from './MediaServer';

export default class ServerUnion {
  private readonly httpServer = new HTTPServer(new Chat());
  private readonly mediaServer = new MediaServer();
  private updateServerTimer?: any;

  readonly onUpdateListeners: Subject<{}> = this.mediaServer.onUpdateListeners;
  readonly onPortError = new Subject<{ reason: string }>();

  constructor(chat: Chat) {
    this.httpServer = new HTTPServer(chat);
  }

  getListeners() {
    return this.mediaServer.listeners;
  }

  delayUpdateServer(settings: Settings) {
    if (this.updateServerTimer != null) {
      clearTimeout(this.updateServerTimer);
    }
    this.updateServerTimer = setTimeout(
      async () => { await this.startServer(settings); },
      1000,
    );
  }

  async startServer(settings: Settings) {
    if (settings.rtmpPort == null || settings.httpPort == null) {
      return;
    }
    try {
      const { httpPort } = await this.mediaServer.setRTMPPort(
        settings.rtmpPort,
      );
      await this.httpServer.setPort(settings.httpPort, httpPort);
    } catch (e) {
      if (e instanceof PortError) {
        this.onPortError.next({ reason: e.message });
        return;
      }
      throw e;
    }
  }
}
