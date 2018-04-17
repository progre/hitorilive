import debug from 'debug';
const logger = debug('hitorilive:toObservable');

import { Observable } from 'rxjs';
import Peer from 'simple-peer';

export function toObservableFromWebSocket(url: string) {
  return new Observable<ArrayBuffer>((subscriber) => {
    const webSocket = new WebSocket(url);
    webSocket.binaryType = 'arraybuffer';
    webSocket.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) {
        subscriber.error(new Error('Unsupported WebSocket'));
        return;
      }
      subscriber.next(ev.data);
    };
    webSocket.onerror = (ev) => {
      subscriber.error(new Error('webSocket error'));
    };
    webSocket.onclose = () => {
      logger('WebSocket media closed.');
      subscriber.complete();
    };
  });
}

export function toObservableFromPeer(peer: Peer.Instance) {
  return new Observable<ArrayBuffer>((subscriber) => {
    peer.on('data', (data: ArrayBuffer) => {
      subscriber.next(data);
    });
    peer.on('error', (err) => {
      subscriber.error(err);
    });
    peer.on('close', () => {
      logger('WebRTC media closed.');
      subscriber.complete();
    });
  });
}
