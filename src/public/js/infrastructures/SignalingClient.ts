import debug from 'debug';
const logger = debug('hitorilive:SignalingClient');

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
    if ('path' in payload) {
      logger('Receive from WebSocket');
      const path = payload.path!;
      return new this(
        webSocket,
        toObservableFromWebSocket(new WebSocket(`ws://${host}${path}`)),
      );
    }
    if ('tunnelId' in payload) {
      logger('Receive from WebRTC');
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
    upstream: Observable<ArrayBuffer>,
  ) {
    let sharedUpstream: Observable<ArrayBuffer> | null = upstream.share();
    sharedUpstream.subscribe({
      error(err: Error) {
        console.error(err.message, err.stack || err);
        sharedUpstream = null;
        signalingWebSocket.close();
      },
      complete() {
        sharedUpstream = null;
        // when close upstream then close signaling
        signalingWebSocket.close();
      },
    });

    const replayableHeaders = sharedUpstream.take(4).shareReplay();
    replayableHeaders.first().subscribe((header) => {
      const expected = [
        0x46, 0x4C, 0x56, 0x01, 0x05, 0x00, 0x00, 0x00,
        0x09, 0x00, 0x00, 0x00, 0x00,
      ];
      if (!new Uint8Array(header).every((x, i) => x === expected[i])) {
        throw new Error(`logic error (${header.byteLength})`);
      }
    });
    this.flvPlayer = flvJS.createPlayer(
      { type: 'flv' },
      {
        isLive: true,
        loader: new ObservableLoader(replayableHeaders.concat(sharedUpstream)),
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
        if (sharedUpstream == null) {
          // stream already closed
          peer.destroy();
          return;
        }
        replayableHeaders
          .concat(sharedUpstream)
          .subscribe({
            next(buffer: ArrayBuffer) { peer.send(buffer); },
            error(err: Error) { console.error(err.message, err.stack || err); },
            complete() { peer.destroy(); },
          });
      } catch (err) {
        console.error(err.message, err.stack || err);
      }
    };
  }
}
