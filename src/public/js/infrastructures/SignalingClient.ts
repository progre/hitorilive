import debug from 'debug';
const log = debug('hitorilive:SignalingClient');

import flvJS from 'flv.js';
import { ConnectableObservable, Observable, Subject, Subscription } from 'rxjs';
import Peer from 'simple-peer';
import { ServerSignalingMessage } from '../../../commons/types';
import connectPeersClient from '../../../libraries/peerconnection/connectPeersClient';
import ObservableLoader from './ObservableLoader';

export type FLVPlayer = ReturnType<typeof flvJS.createPlayer>;

export default class SignalingClient {
  readonly flvPlayer: FLVPlayer;
  private readonly replayableHeaders: ConnectableObservable<ArrayBuffer>;
  private readonly replayableHeadersSubscription: Subscription;
  private publishedUpstream?: ConnectableObservable<ArrayBuffer>;
  private readonly publishedUpstreamSubscription: Subscription;
  private downstreamsCount = 0;

  readonly onClose = new Subject<void>();

  constructor(
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
        log(`Upstream completed. Reset signaling...`);
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
    signalingWebSocket.onmessage = (ev) => {
      const { type, payload }: ServerSignalingMessage = JSON.parse(ev.data);
      if (type !== 'downstream') {
        return;
      }
      if (payload.tunnelId == null) {
        throw new Error(`logic error (type=${type} payload=${JSON.stringify(payload)})`);
      }
      this.connectDownstream(signalingWebSocket, payload.tunnelId);
    };
  }

  private connectDownstream(signalingWebSocket: WebSocket, tunnelId: string) {
    log(`tunnelId: ${tunnelId}, Downstream WebRTC connecting...`);
    this.downstreamsCount += 1;
    connectPeersClient(
      signalingWebSocket,
      tunnelId,
      { channelConfig: { maxPacketLifeTime: 10 * 1000 } },
    )
      .flatMap((peer) => {
        log(`tunnelId: ${tunnelId}, Connecting completed. downstreams: ${this.downstreamsCount}`);
        if (this.publishedUpstream == null) {
          // stream already closed
          peer.destroy();
          return Observable.of({});
        }
        const stream = this.replayableHeaders.concat(this.publishedUpstream);
        return transfer(stream, peer);
      })
      .subscribe({
        error: (err) => {
          this.downstreamsCount -= 1;
          log(
            `tunnelId: ${tunnelId}, Downstream closed with error.`
            + ` downstreams: ${this.downstreamsCount}`,
          );
          console.error(err);
        },
        complete: () => {
          this.downstreamsCount -= 1;
          log(`tunnelId: ${tunnelId}, Downstream closed. downstreams: ${this.downstreamsCount}`);
        },
      });
  }
}

function transfer(upstream: Observable<ArrayBuffer>, peer: Peer.Instance) {
  return new Observable((subscribe) => {
    const send = getOptimizedSend();
    const subscription = upstream.subscribe({
      next: (buffer: ArrayBuffer) => {
        if ((<any>peer).destroyed || (<any>peer)._channel.readyState !== 'open') {
          return;
        }
        send(peer, buffer);
      },
      error(err: Error) {
        console.error(err.message, err.stack || err);
        peer.destroy();
      },
      complete() {
        peer.destroy();
      },
    });
    peer.on('close', () => {
      subscription.unsubscribe();
      subscribe.complete();
    });
    peer.on('error', (err) => {
      subscription.unsubscribe();
      subscribe.error(err);
    });
  });
}

function getOptimizedSend() {
  // Firefox×Firefox can send large data, but it can't send with Chrome.
  return (peer: Peer.Instance, buffer: ArrayBuffer) => {
    for (let i = 0; i < buffer.byteLength; i += 64 * 1024) {
      peer.send(buffer.slice(i, i + 64 * 1024));
    }
  };
}
