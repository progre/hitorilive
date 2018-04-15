import debug from 'debug';
const log = debug('hitorilive:SignalingClient');

import flvJS from 'flv.js';
import { Observable, Subject, Subscription } from 'rxjs';
import Peer from 'simple-peer';
import { ServerSignalingMessage } from '../../../commons/types';
import connectPeersClient from '../../../utils/connectPeersClient';
import ObservableLoader from './ObservableLoader';
import { toObservableFromPeer, toObservableFromWebSocket } from './toObservable';

export type FLVPlayer = ReturnType<typeof flvJS.createPlayer>;

export default class SignalingClient {
  readonly flvPlayer: FLVPlayer;
  private readonly replayableHeaders: Observable<ArrayBuffer>;
  private sharedUpstream?: Observable<ArrayBuffer>;
  private downstreamsCount = 0;

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
      log('Receive from WebSocket');
      const path = payload.path!;
      return new this(
        webSocket,
        toObservableFromWebSocket(`ws://${host}${path}`),
      );
    }
    if ('tunnelId' in payload) {
      const tunnelId = payload.tunnelId!;
      // TODO: stun経由
      log('WebRTC connecting...');
      const peer = await connectPeersClient(webSocket, tunnelId, { initiator: true });
      log('Connecting completed. Receive from WebRTC');
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
    this.sharedUpstream = upstream.share();
    this.sharedUpstream.subscribe({
      error: (err: Error) => {
        console.error(err.message, err.stack || err);
        this.sharedUpstream = undefined;
        signalingWebSocket.close();
      },
      complete: () => {
        this.sharedUpstream = undefined;
        // when close upstream then close signaling
        signalingWebSocket.close();
      },
    });

    this.replayableHeaders = this.sharedUpstream.take(4).shareReplay();
    this.replayableHeaders.first().subscribe((header) => {
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
        loader: new ObservableLoader(this.replayableHeaders.concat(this.sharedUpstream)),
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
        if (type !== 'downstream') {
          return;
        }
        if (payload.tunnelId == null) {
          throw new Error(`logic error (type=${type} payload=${JSON.stringify(payload)})`);
        }
        await this.connectDownstream(signalingWebSocket, payload.tunnelId);
      } catch (err) {
        console.error(err);
      }
    };
  }

  private async connectDownstream(
    signalingWebSocket: WebSocket,
    tunnelId: string,
  ) {
    log(`tunnelId(${tunnelId}) Downstream WebRTC connecting...`);
    let peer: Peer.Instance | null = await connectPeersClient(signalingWebSocket, tunnelId, {});
    this.downstreamsCount += 1;
    log(`tunnelId(${tunnelId}) Connecting completed. downstreams(${this.downstreamsCount})`);

    let subscription: Subscription;
    peer.on('close', () => {
      subscription.unsubscribe();
      peer = null;
      this.downstreamsCount -= 1;
      log(`tunnelId(${tunnelId}) Downstream closed. downstreams(${this.downstreamsCount})`);
    });
    peer.on('error', (err) => {
      console.error(err.message, err.stack || err);
    });
    if (this.sharedUpstream == null) {
      // stream already closed
      peer.destroy();
      return;
    }
    subscription = this.replayableHeaders
      .concat(this.sharedUpstream)
      .subscribe({
        next(buffer: ArrayBuffer) {
          if (peer == null) {
            return;
          }
          peer.send(buffer);
        },
        error(err: Error) { console.error(err.message, err.stack || err); },
        complete() {
          log(`tunnelId(${tunnelId}) Upstream completed.`);
          if (peer == null) {
            return;
          }
          peer.destroy();
        },
      });
  }
}
