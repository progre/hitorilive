import { sync as uid } from 'uid-safe';
import WebSocket from 'ws';
import { TunnelCompletedMessage, TunnelMessage } from './connectPeersTypes';
export type ConnectPeersClientMessage = TunnelMessage | TunnelCompletedMessage;

export default async function connectPeersServer(
  upstream: WebSocket,
  downstream: WebSocket,
) {
  return new Promise((resolve, reject) => {
    const tunnelId = uid(16);
    let upstreamConnected = false;
    let downstreamConnected = false;
    let onConnect: Function;
    const upstreamMessageHandler = (ev: { data: any }) => {
      if (downstream.readyState !== WebSocket.OPEN) {
        return;
      }
      const { type, payload } = <ConnectPeersClientMessage>JSON.parse(ev.data);
      if (payload.tunnelId !== tunnelId) {
        return;
      }
      switch (type) {
        case 'tunnel': {
          downstream.send(ev.data);
          return;
        }
        case 'tunnelCompleted': {
          upstreamConnected = true;
          onConnect();
          return;
        }
        default:
        // NOP
      }
    };
    const downstreamMessageHandler = (ev: { data: any }) => {
      if (upstream.readyState !== WebSocket.OPEN) {
        return;
      }
      const { type, payload } = <ConnectPeersClientMessage>JSON.parse(ev.data);
      if (payload.tunnelId !== tunnelId) {
        return;
      }
      switch (type) {
        case 'tunnel': {
          upstream.send(ev.data);
          return;
        }
        case 'tunnelCompleted': {
          downstreamConnected = true;
          onConnect();
          return;
        }
        default:
        // NOP
      }
    };
    let removeAllListeners: Function;
    onConnect = () => {
      if (!upstreamConnected || !downstreamConnected) {
        return;
      }
      removeAllListeners();
      resolve();
    };
    const errorHandler = () => {
      removeAllListeners();
      reject(new Error('connectPeers failed.'));
    };

    removeAllListeners = () => {
      upstream.removeEventListener('message', upstreamMessageHandler);
      upstream.removeEventListener('error', errorHandler);
      downstream.removeEventListener('message', downstreamMessageHandler);
      downstream.removeEventListener('error', errorHandler);
    };
    upstream.addEventListener('message', upstreamMessageHandler);
    upstream.addEventListener('error', errorHandler);
    downstream.addEventListener('message', downstreamMessageHandler);
    downstream.addEventListener('error', errorHandler);
    upstream.send(JSON.stringify({ type: 'downstream', payload: { tunnelId } }));
    downstream.send(JSON.stringify({ type: 'upstream', payload: { tunnelId } }));
  });
}
