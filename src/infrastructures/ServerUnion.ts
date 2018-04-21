import net from 'net';
import { Subject } from 'rxjs';
import WebSocket from 'ws';
import { Settings } from '../commons/types';
import HTTPServer from './HTTPServer';
import MediaServer from './MediaServer';
import Upnp, { PortAlreadyAssignedError } from './Upnp';

export default class ServerUnion {
  private readonly httpServer: HTTPServer;
  private readonly mediaServer = new MediaServer();
  private readonly upnp: Upnp;
  private updateServerTimer?: any;
  private serverStarting = false;

  /** This event doesn't countain p2p connections. */
  readonly onUpdateListeners: Subject<{}> = this.mediaServer.onUpdateListeners;
  readonly onJoin: Subject<WebSocket>;
  readonly error = new Subject<{ reason: string }>();

  constructor(upnpDescription: string) {
    this.httpServer = new HTTPServer();
    this.upnp = new Upnp(upnpDescription);

    this.onJoin = this.httpServer.onJoin;
  }

  /** This property doesn't countain p2p connections. */
  getListeners() {
    return this.mediaServer.listeners;
  }

  delayUpdateServer(settings: Settings) {
    if (this.updateServerTimer != null) {
      clearTimeout(this.updateServerTimer);
    }
    this.updateServerTimer = setTimeout(
      async () => {
        if (this.serverStarting) {
          this.delayUpdateServer(settings);
          return;
        }
        this.serverStarting = true;
        await this.startServer(settings);
        this.serverStarting = false;
      },
      1000,
    );
  }

  isRunning() {
    return this.mediaServer.isRunning() && this.httpServer.isRunning();
  }

  async startServer(settings: Settings) {
    await this.closeServer(settings.useUpnp);

    if (!await isFreePort(settings.rtmpPort)) {
      this.error.next({ reason: `TCP ${settings.rtmpPort} is already assigned.` });
      return;
    }
    if (!await isFreePort(settings.httpPort)) {
      this.error.next({ reason: `TCP ${settings.httpPort} is already assigned.` });
      return;
    }
    if (settings.useUpnp) {
      try {
        await this.upnp.open(settings.httpPort);
      } catch (e) {
        if (e instanceof PortAlreadyAssignedError) {
          this.error.next({ reason: `UPnP port mapping (TCP ${settings.httpPort}) failed.` });
          return;
        }
        console.error(e.stack || e);
        this.error.next(e.message);
      }
    }
    const { httpPort } = await this.mediaServer.startServer(
      settings.rtmpPort,
    );
    await this.httpServer.startServer(settings.httpPort, httpPort);
  }

  async closeServer(useUpnp: boolean) {
    if (this.httpServer.isRunning()) {
      const oldHTTPPort = this.httpServer.port;
      await this.httpServer.stopServer();
      if (useUpnp) {
        try {
          await this.upnp.close(oldHTTPPort);
        } catch (e) {
          console.error(e.stack || e);
          this.error.next(e.message);
        }
      }
    }
    if (this.mediaServer.isRunning()) {
      await this.mediaServer.stopServer();
    }
  }
}

async function isFreePort(port: number) {
  return new Promise<boolean>((resolve, reject) => {
    const conn = net.connect(port);
    conn.on('connect', () => {
      conn.destroy();
      resolve(false);
    });
    conn.on('error', () => {
      conn.destroy();
      resolve(true);
    });
  });
}
