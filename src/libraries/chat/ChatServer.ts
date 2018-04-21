import http from 'http';
import { Observable } from 'rxjs';
import ChatDomain from './ChatDomain';

export default class ChatServer {
  constructor(
    private chatDomain: ChatDomain,
  ) {
  }

  handleAPIRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
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
        end(res, 400);
    }
  }

  private handleGetMessages(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    res.writeHead(
      200,
      { 'Content-Type': 'application/json' },
    );
    const subscription = this.chatDomain.onMessage.subscribe(
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
          this.chatDomain.addMessage(message);
          end(res, 200);
        },
        (e) => { console.error(e.stack || e); },
    );
  }
}

function end(res: http.ServerResponse, statusCode: number) {
  res.writeHead(statusCode);
  res.end(`${res.statusCode} ${http.STATUS_CODES[String(res.statusCode)]}`);
}
