import debug from 'debug';
const log = debug('hitorilive:SignalingClient');

import flvJS from 'flv.js';
import { ConnectableObservable, Observable, Subject, Subscription } from 'rxjs';
import Peer from 'simple-peer';
import { ServerSignalingMessage } from '../../../commons/types';
import connectPeersClient from '../../../utils/connectPeersClient';
import ObservableLoader from './ObservableLoader';
import { toObservableFromPeer, toObservableFromWebSocket } from './toObservable';

export type FLVPlayer = ReturnType<typeof flvJS.createPlayer>;

export default class SignalingClient {
  readonly flvPlayer: FLVPlayer;
  private readonly replayableHeaders: ConnectableObservable<ArrayBuffer>;
  private readonly replayableHeadersSubscription: Subscription;
  private publishedUpstream?: ConnectableObservable<ArrayBuffer>;
  private readonly publishedUpstreamSubscription: Subscription;
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
      log(`tunnelId(${tunnelId}) Upstream WebRTC connecting...`);
      const peer = await connectPeersClient(webSocket, tunnelId, { initiator: true });
      log(`tunnelId(${tunnelId}) Connecting completed. Receive from WebRTC`);
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
    this.publishedUpstream = upstream.publish();
    this.publishedUpstreamSubscription = this.publishedUpstream.connect();
    this.publishedUpstream.subscribe({
      error: (err: Error) => {
        console.error(err.message, err.stack || err);
        this.publishedUpstream = undefined;
        signalingWebSocket.close();
      },
      complete: () => {
        this.publishedUpstream = undefined;
        // when close upstream then close signaling
        signalingWebSocket.close();
      },
    });

    this.replayableHeaders = this.publishedUpstream.take(4).publishReplay();
    this.replayableHeadersSubscription = this.replayableHeaders.connect();
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
      {
        type: 'flv',
        isLive: true,
      },
      {
        loader: new ObservableLoader(this.replayableHeaders.concat(this.publishedUpstream)),
      },
    );

    // Probably no error is thrown after opening.
    signalingWebSocket.onerror = (ev) => {
      signalingWebSocket.onerror = null;
      signalingWebSocket.close();
    };
    signalingWebSocket.onclose = (ev) => {
      signalingWebSocket.onclose = null;
      this.replayableHeadersSubscription.unsubscribe();
      this.publishedUpstreamSubscription.unsubscribe();
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
    if (this.publishedUpstream == null) {
      // stream already closed
      peer.destroy();
      return;
    }
    const send = getOptimizedSend();
    subscription = this.replayableHeaders
      .concat(this.publishedUpstream)
      .subscribe({
        next: (buffer: ArrayBuffer) => {
          if (peer == null || (<any>peer)._channel.readyState !== 'open') {
            return;
          }
          send(peer, buffer);
        },
        error(err: Error) { console.error(err.message, err.stack || err); },
        complete() {
          log(`tunnelId(${tunnelId}) Downstream completed.`);
          if (peer == null || (<any>peer)._channel.readyState !== 'open') {
            return;
          }
          peer.destroy();
        },
      });
  }
}

function getOptimizedSend() {
  // Firefox×Firefox can send large data, but it can't send with Chrome.
  return (peer: Peer.Instance, buffer: ArrayBuffer) => {
    for (let i = 0; i < buffer.byteLength; i += 64 * 1024) {
      peer.send(buffer.slice(i, i + 64 * 1024));
    }
  };
}
