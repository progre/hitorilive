import http from 'http';
import { Subject } from 'rxjs';
// tslint:disable-next-line:variable-name
const NodeMediaServer = require('node-media-server');
// tslint:disable-next-line:no-submodule-imports
const context = require('node-media-server/node_core_ctx');
import net from 'net';

export class PortError extends Error {
}

export default class MediaServer {
  private nms?: any;
  listeners = 0;

  onUpdateListeners = new Subject();

  constructor() {
    setInterval(() => { this.checkListeners(); }, 1000);
  }

  private checkListeners() {
    const newValue = (
      (<Map<any, any>>context.sessions).size
      - (<Map<any, any>>context.publishers).size
    );
    if (newValue === this.listeners) {
      return;
    }
    this.listeners = newValue;
    this.onUpdateListeners.next();
  }

  isRunning() {
    return this.nms != null;
  }

  /**
   * @throws PortError
   */
  async setRTMPPort(rtmpPort: number) {
    if (this.nms != null) {
      await this.stopServer();
    }
    if (!await isFreePort(rtmpPort)) {
      throw new PortError(`TCP ${rtmpPort} is already assigned.`);
    }
    return this.startServer(rtmpPort);
  }

  private async startServer(rtmpPort: number) {
    const config = {
      rtmp: {
        port: rtmpPort,
        chunk_size: 60000,
        gop_cache: true,
        ping: 60,
        ping_timeout: 30,
      },
      http: {
        allow_origin: '*',
        port: '0',
        webroot: `${__dirname}/public`,
      },
    };
    this.nms = new NodeMediaServer(config);
    this.nms.run();
    const httpServer = (<http.Server>this.nms.nhs.httpServer);
    monkeyPatchForReload(this.nms);

    await new Promise((resolve, reject) => {
      const timer = setInterval(
        () => {
          if (!httpServer.listening) {
            return;
          }
          clearInterval(timer);
          resolve();
        },
        100,
      );
    });
    return { httpPort: httpServer.address().port };
  }

  private async stopServer() {
    this.nms.stop();
    this.nms = null;
    await new Promise((resolve, _) => {
      setTimeout(resolve, 1000);
    });
    monkeyPatchClearResources();
  }
}

function monkeyPatchClearResources() {
  (<Set<any>>context.idlePlayers).clear();
  (<Map<any, any>>context.publishers).clear();
}

function monkeyPatchForReload(nms: any) {
  const onConnect = nms.nhs.onConnect.bind(nms.nhs);
  nms.nhs.onConnect = (req: any, res: any) => {
    try {
      onConnect(req, res);
    } catch (e) {
      if (e.message === 'not opened') {
        return;
      }
      throw e;
    }
  };
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
