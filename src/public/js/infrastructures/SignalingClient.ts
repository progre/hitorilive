import flvJS from 'flv.js';
import { Observable, Subject } from 'rxjs';
import { ServerSignalingMessage } from '../../../commons/types';
import connectPeersClient from '../../../utils/connectPeersClient';
import ObservableLoader from './ObservableLoader';
import { toObservableFromPeer, toObservableFromWebSocket } from './toObservable';

export type FLVPlayer = ReturnType<typeof flvJS.createPlayer>;

export default class SignalingClient {
  readonly flvPlayer: FLVPlayer;

  readonly onClose = new Subject<void>();

  static async create(host: string) {
    type Return = { webSocket: WebSocket; data: ServerSignalingMessage };
    // TODO: promiseではmessageを取りこぼす疑いがある
    const { webSocket, data: { type, payload } } = await new Promise<Return>((resolve, reject) => {
      const ws = new WebSocket(`ws://${host}/join`);
      ws.onerror = (ev) => {
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
        reject(new Error('Signaling websocket emitted an error.'));
      };
      ws.onmessage = (ev) => {
        ws.onerror = null;
        ws.onmessage = null;
        resolve({ webSocket: ws, data: JSON.parse(ev.data) });
      };
    });
    if (type !== 'upstream') {
      throw new Error('logic error');
    }
    if ('url' in payload) {
      const url = payload.url!;
      return new this(
        webSocket,
        toObservableFromWebSocket(new WebSocket(url)),
      );
    }
    if ('tunnelId' in payload) {
      const tunnelId = payload.tunnelId!;
      // TODO: stun経由
      const peer = await connectPeersClient(webSocket, tunnelId, { initiator: true });
      return new this(
        webSocket,
        toObservableFromPeer(peer),
      );
    }
    throw new Error('logic error');
  }

  private constructor(
    signalingWebSocket: WebSocket,
    observable: Observable<ArrayBuffer>,
  ) {
    const shared = observable.share();
    const replayableHeaders = shared.take(4).shareReplay();

    this.flvPlayer = flvJS.createPlayer(
      { type: 'flv' },
      {
        isLive: true,
        loader: new ObservableLoader(replayableHeaders.concat(shared)),
      },
    );

    // Probably no error is thrown after opening.
    signalingWebSocket.onerror = (ev) => {
      signalingWebSocket.onerror = null;
      signalingWebSocket.close();
    };
    signalingWebSocket.onclose = (ev) => {
      signalingWebSocket.onclose = null;
      this.onClose.next();
      this.onClose.complete();
    };
    signalingWebSocket.onmessage = async (ev) => {
      try {
        const { type, payload }: ServerSignalingMessage = JSON.parse(ev.data);
        if (type !== 'downstream' || payload.tunnelId == null) {
          throw new Error(`logic error (type=${type} payload=${JSON.stringify(payload)})`);
        }
        signalingWebSocket.onmessage = null;
        const peer = await connectPeersClient(signalingWebSocket, payload.tunnelId, {});
        // TODO: neet to unsubscribe
        replayableHeaders
          .concat(shared)
          .subscribe((buffer) => {
            peer.send(buffer);
          });
      } catch (err) {
        console.error(err.message, err.stack || err);
      }
    };
  }
}
