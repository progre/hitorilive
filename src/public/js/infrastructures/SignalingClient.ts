import flvJS from 'flv.js';
import { Subject } from 'rxjs';
import Peer from 'simple-peer';
import { ServerSignalingMessage } from '../../../commons/types';
import connectPeersClient from '../../../utils/connectPeersClient';
import DataChannelLoader from './DataChannelLoader';

export type FLVPlayer = ReturnType<typeof flvJS.createPlayer>;

export default class SignalingClient {
  readonly onClose = new Subject<void>();

  static async create(host: string) {
    type Return = { webSocket: WebSocket; data: ServerSignalingMessage };
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
      return new this(
        webSocket,
        flvJS.createPlayer(
          {
            url: payload.url,
            type: 'flv',
          },
          { isLive: true },
        ),
      );
    }
    if ('tunnelId' in payload) {
      const tunnelId = payload.tunnelId!;
      // TODO: stun経由
      const peer = await connectPeersClient(webSocket, tunnelId, { initiator: true });
      return new this(
        webSocket,
        flvJS.createPlayer(
          { type: 'flv' },
          {
            isLive: true,
            loader: new DataChannelLoader(peer),
          },
        ),
      );
    }
    throw new Error('logic error');
  }

  private constructor(
    signalingWebSocket: WebSocket,
    public flvPlayer: FLVPlayer,
    // いつでもsubscribe/unsubscribeできるものをもっておく必要がありそう
  ) {
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
        console.log(ev.data);
        const { type, payload }: ServerSignalingMessage = JSON.parse(ev.data);
        if (type !== 'downstream' || payload.tunnelId == null) {
          throw new Error(`logic error (type=${type} payload=${JSON.stringify(payload)})`);
        }
        signalingWebSocket.onmessage = null;
        const peer = await connectPeersClient(signalingWebSocket, payload.tunnelId, {});
        proxyTo(peer);
      } catch (err) {
        console.error(err.message, err.stack || err);
      }
    };
  }
}

// TODO: まともな実装
function proxyTo(peer: Peer.Instance) {
  const webSocket = new WebSocket('ws://127.0.0.1:17144/live/.flv');
  webSocket.onmessage = (ev) => {
    console.log(ev.type);
    peer.send(ev.data);
  };
}
