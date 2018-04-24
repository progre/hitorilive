import http from 'http';
import net from 'net';
import { Subject } from 'rxjs';
// tslint:disable-next-line:variable-name
const NodeMediaServer = require('node-media-server');
// tslint:disable-next-line:no-submodule-imports
const context = require('node-media-server/node_core_ctx');

export default class MediaServer {
  private nms?: any;
  listeners = 0;

  readonly onUpdateListeners = new Subject();

  constructor() {
    setInterval(
      () => {
        if (!this.isRunning()) {
          return;
        }
        this.checkListeners();
      },
      1000,
    );
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

  async startServer(rtmpPort: number) {
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
    const httpServer = getHttpServer(this.nms);
    await checkListening(httpServer);
    return { httpPort: httpServer.address().port };
  }

  async stopServer() {
    const httpServer = getHttpServer(this.nms);
    const tcpServer: net.Server = this.nms.nrs.tcpServer;
    this.nms.stop();
    this.nms = null;
    this.listeners = 0;
    this.onUpdateListeners.next();
    await checkClose(httpServer);
    await checkClose(tcpServer);

    monkeyPatchClearResources();
  }
}

async function checkListening(server: net.Server) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(
      () => {
        if (!server.listening) {
          return;
        }
        clearInterval(timer);
        resolve();
      },
      100,
    );
  });
}

async function checkClose(server: net.Server) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(
      () => {
        if (server.listening) {
          return;
        }
        server.getConnections((err, count) => {
          if (count > 0) {
            return;
          }
          clearInterval(timer);
          resolve();
        });
      },
      100,
    );
  });
}

function getHttpServer(nms: any): http.Server {
  return nms.nhs.httpServer;
}

function monkeyPatchClearResources() {
  (<Set<any>>context.idlePlayers).clear();
  (<Map<any, any>>context.publishers).clear();
}
