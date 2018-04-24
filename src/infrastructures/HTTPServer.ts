import debug from 'debug';
const log = debug('hitorilive:HTTPServer');
import http from 'http';
import httpProxy from 'http-proxy';
import net from 'net';
import { Subject } from 'rxjs';
import WebSocket from 'ws';

export default class HTTPServer {
  private server?: http.Server;
  private proxy = httpProxy.createProxyServer();
  private readonly webSocketServer = new WebSocket.Server({ noServer: true });
  private sockets = new Set<net.Socket>();
  port = 0;

  readonly onJoin = new Subject<WebSocket>();

  isRunning() {
    return this.server != null;
  }

  async startServer(port: number, httpMediaServerPort: number) {
    const mediaServerHost = `127.0.0.1:${httpMediaServerPort}`;
    this.server = http.createServer((req, res) => {
      if (req.url!.startsWith('/api/v1/')) {
        this.handleAPIRequest(req, res);
        return;
      }
      this.proxy.web(
        req,
        res,
        { target: `http://${mediaServerHost}` },
        (err) => { console.error(err.stack || err); },
      );
    });
    this.server.on('upgrade', (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
      if (this.server == null) {
        // already shutdowned
        socket.destroy();
        return;
      }
      this.sockets.add(socket);
      socket.once('close', () => {
        this.sockets.delete(socket);
      });
      if (req.url === '/join') {
        this.webSocketServer.handleUpgrade(req, socket, head, (ws) => {
          this.onJoin.next(ws);
        });
        return;
      }
      this.proxy.ws(req, socket, head, { target: `ws://${mediaServerHost}` });
    });
    await new Promise((resolve, reject) => {
      this.server!.listen(port, resolve);
    });
    log(`listen ${port}`);
    this.port = port;
  }

  async stopServer() {
    if (this.server == null) {
      return;
    }
    log('stopServer');
    const server = this.server;
    this.server = undefined;
    // proxy isn't needed when no listen
    this.sockets.forEach((socket) => {
      socket.destroy();
    });
    await new Promise((resolve, reject) => {
      server.close(resolve); // close isn't finish when client is connecting.
    });
    log('stopped');
  }

  private handleAPIRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    res.writeHead(400);
    res.end(`400 ${http.STATUS_CODES[String(400)]}`);
  }
}
