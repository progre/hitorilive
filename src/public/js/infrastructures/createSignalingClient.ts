import debug from 'debug';
const log = debug('hitorilive:createSignalingClient');

import { Observable } from 'rxjs';
import { ServerSignalingMessage } from '../../../commons/types';
import connectPeersClient from '../../../utils/connectPeersClient';
import SignalingClient from './SignalingClient';
import { toObservableFromPeer, toObservableFromWebSocket } from './toObservable';

export default function createSignalingClient(host: string) {
  type Return = { webSocket: WebSocket; data: ServerSignalingMessage };
  return new Observable<Return>(
    (subscribe) => {
      const ws = new WebSocket(`ws://${host}/join`);
      ws.onerror = (ev) => {
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
        subscribe.error(new Error('Signaling websocket emitted an error.'));
      };
      ws.onmessage = (ev) => {
        ws.onerror = null;
        ws.onmessage = null;
        const data: ServerSignalingMessage = JSON.parse(ev.data);
        if (data.type !== 'upstream') {
          throw new Error('logic error');
        }
        subscribe.next({ data, webSocket: ws });
        subscribe.complete();
      };
    })
    .flatMap(({ webSocket, data }) => {
      if ('path' in data.payload) {
        log('Receive from WebSocket');
        const path = data.payload.path;
        return Observable.of(
          new SignalingClient(
            webSocket,
            toObservableFromWebSocket(`ws://${host}${path}`),
          ),
        );
      }
      if ('tunnelId' in data.payload) {
        const tunnelId = data.payload.tunnelId!;
        log(`tunnelId: ${tunnelId}, Upstream WebRTC connecting...`);
        return connectPeersClient(webSocket, tunnelId, { initiator: true })
          .map((peer) => {
            log(`tunnelId: ${tunnelId}, Connecting completed. Receive from WebRTC`);
            return new SignalingClient(
              webSocket,
              toObservableFromPeer(peer),
            );
          });
      }
      throw new Error('logic error');
    });
}
