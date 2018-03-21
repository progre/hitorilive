// tslint:disable-next-line:variable-name
const NodeMediaServer = require('node-media-server');
import net from 'net';

export default class LiveServer {
  private nms?: any;

  isRunning() {
    return this.nms != null;
  }

  async setPort(rtmpPort: number, httpPort: number) {
    if (this.nms != null) {
      this.nms.close();
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

    this.nms.run();
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
