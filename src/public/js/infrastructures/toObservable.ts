import { Observable } from 'rxjs';
import Peer from 'simple-peer';

export function toObservableFromWebSocket(webSocket: WebSocket) {
  return new Observable<ArrayBuffer>((subscriber) => {
    webSocket.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        subscriber.next(ev.data);
      } else if (ev.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          subscriber.next(reader.result);
        };
        reader.readAsArrayBuffer(ev.data);
      } else {
        subscriber.error(new Error('Unsupported WebSocket'));
      }
    };
    webSocket.onerror = (ev) => { subscriber.error(new Error('webSocket error')); };
    webSocket.onclose = () => { subscriber.complete(); };
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
      subscriber.complete();
    });
  });
}
