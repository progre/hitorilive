import http from 'http';
import httpProxy from 'http-proxy';
import net from 'net';
import { Subject } from 'rxjs';
import WebSocket from 'ws';
import ChatServer from '../libraries/chat/ChatServer';

export default class HTTPServer {
  private server?: http.Server;
  private proxy?: httpProxy = httpProxy.createProxyServer();
  private readonly webSocketServer = new WebSocket.Server({ noServer: true });
  port = 0;

  readonly onJoin = new Subject<WebSocket>();

  constructor(
    private chatServer: ChatServer,
  ) {
  }

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
      if (this.proxy == null) {
        // already shutdowned
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
      if (req.url === '/join') {
        this.webSocketServer.handleUpgrade(req, socket, head, (ws) => {
          this.onJoin.next(ws);
        });
        return;
      }
      if (this.proxy == null) {
        // already shutdowned
        return;
      }
      this.proxy.ws(req, socket, head, { target: `ws://${mediaServerHost}` });
    });
    await new Promise((resolve, reject) => {
      this.server!.listen(port, resolve);
    });
    this.port = port;
  }

  async stopServer() {
    const server = this.server!;
    const proxy = this.proxy!;
    this.server = undefined;
    this.proxy = undefined;
    await Promise.race([
      Promise.all([
        new Promise((resolve, reject) => {
          server.close(resolve); // close isn't finish when client is connecting.
        }),
        new Promise((resolve, reject) => {
          proxy.close(resolve);
        }),
      ]),
      new Promise((resolve, reject) => { setTimeout(resolve, 3000); }),
    ]);
  }

  private handleAPIRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    if (req.url === '/api/v1/messages') {
      this.chatServer.handleAPIRequest(req, res);
      return;
    }
    res.writeHead(400);
    res.end(`400 ${http.STATUS_CODES[String(400)]}`);
  }
}
