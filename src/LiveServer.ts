import { Subject } from 'rxjs';
// tslint:disable-next-line:variable-name
const NodeMediaServer = require('node-media-server');
// tslint:disable-next-line:no-submodule-imports
const context = require('node-media-server/node_core_ctx');
import net from 'net';

export default class LiveServer {
  private nms?: any;
  listeners = 0;

  onUpdatedListeners = new Subject();

  constructor() {
    setInterval(
      () => {
        const newValue
          = (<Map<any, any>>context.sessions).size
          - (<Map<any, any>>context.publishers).size;
        if (newValue === this.listeners) {
          return;
        }
        this.listeners = newValue;
        this.onUpdatedListeners.next();
      },
      1000,
    );
  }

  isRunning() {
    return this.nms != null;
  }

  async setPort(rtmpPort: number, httpPort: number) {
    if (this.nms != null) {
      this.nms.stop();
      await new Promise((resolve, _) => {
        setTimeout(resolve, 1000);
      });

      // monkey patch
      (<Set<any>>context.idlePlayers).clear();
      (<Map<any, any>>context.publishers).clear();
    }
    if (!await isFreePort(rtmpPort)) {
      return { error: { reason: `TCP ${rtmpPort} is already assigned.` } };
    }
    if (!await isFreePort(httpPort)) {
      return { error: { reason: `TCP ${rtmpPort} is already assigned.` } };
    }
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
        port: httpPort,
        webroot: './dist/public',
      },
    };
    this.nms = new NodeMediaServer(config);
    this.nms.run();

    // monkey patch
    const onConnect = this.nms.nhs.onConnect.bind(this.nms.nhs);
    this.nms.nhs.onConnect = (req: any, res: any) => {
      try {
        onConnect(req, res);
      } catch (e) {
        if (e.message === 'not opened') {
          return;
        }
        throw e;
      }
    };

    return {};
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
