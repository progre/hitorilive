import http from 'http';
import httpProxy from 'http-proxy';
import net from 'net';
import { Observable, Subject } from 'rxjs';
import WebSocket from 'ws';
import Chat from '../domains/Chat';

export default class HTTPServer {
  private server?: http.Server;
  private readonly proxy = httpProxy.createProxyServer();
  private readonly webSocketServer = new WebSocket.Server({ noServer: true });
  port = 0;

  readonly onJoin = new Subject<WebSocket>();

  constructor(
    private chat: Chat,
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
      this.proxy.ws(req, socket, head, { target: `ws://${mediaServerHost}` });
    });
    await new Promise((resolve, reject) => {
      this.server!.listen(port, resolve);
    });
    this.port = port;
  }

  async stopServer() {
    await Promise.race([
      new Promise((resolve, reject) => {
        this.server!.close(resolve); // close isn't finish when client is connecting.
        this.server = undefined;
      }),
      new Promise((resolve, reject) => { setTimeout(resolve, 3000); }),
    ]);
  }

  private handleAPIRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    if (req.url === '/api/v1/messages') {
      switch (req.method) {
        case 'GET': {
          this.handleGetMessages(req, res);
          return;
        }
        case 'POST': {
          this.handlePostMessage(req, res);
          return;
        }
        default:
        // NOP
      }
    }
    end(res, 400);
  }

  private handleGetMessages(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    res.writeHead(
      200,
      { 'Content-Type': 'application/json' },
    );
    const subscription = this.chat.onMessage.subscribe(
      (message) => {
        if (res.connection.destroyed) {
          subscription.unsubscribe();
          return;
        }
        res.write(`${JSON.stringify([message])}\r`);
      },
      (e) => { console.error(e.stack || e); },
    );
  }

  private handlePostMessage(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    const length = Number(req.headers['content-length']);
    if (Number.isNaN(length) || length <= 0) {
      end(res, 411);
      return;
    }
    if (10000 < length) {
      end(res, 413);
      return;
    }
    new Observable<string>(
      (subscriber) => {
        req.on('readable', () => { subscriber.next(req.read()); });
        req.on('end', () => { subscriber.complete(); });
      })
      .filter(x => x != null)
      .reduce((acc, value) => acc + value, '')
      .subscribe(
        (x) => {
          const message = JSON.parse(x);
          if (
            typeof message.message !== 'string'
            || message.message.length <= 0
          ) {
            end(res, 400);
            return;
          }
          this.chat.addMessage(message);
          end(res, 200);
        },
        (e) => { console.error(e.stack || e); },
    );
  }
}

function end(res: http.ServerResponse, statusCode: number) {
  res.writeHead(200);
  res.end(`${res.statusCode} ${http.STATUS_CODES[String(res.statusCode)]}`);
}
