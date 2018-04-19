import debug from 'debug';
const log = debug('hitorilive:connectPeersServer');

import { sync as uid } from 'uid-safe';
import WebSocket from 'ws';
import { TunnelCompletedMessage, TunnelMessage } from './connectPeersTypes';
export type ConnectPeersClientMessage = TunnelMessage | TunnelCompletedMessage;

export class SocketClosedError extends Error {
  name = 'SocketClosedError';
}

/**
 * @throws SocketClosedError
 */
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
          log(`tunnelId: ${tunnelId}, Signaling message upstream -> downstream`);
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
          log(`tunnelId: ${tunnelId}, Signaling message downstream -> upstream`);
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
    const errorHandler = (ev: { error: any; message: any; type: string; target: WebSocket }) => {
      removeAllListeners();
      ev.target.close();
      reject(new Error(`connectPeers failed. reason: ${ev.message}, ${ev.error}`));
    };
    const closeHandler = (ev: { reason: string }) => {
      removeAllListeners();
      reject(new SocketClosedError(`connectPeers failed. reason: socket closed (${ev.reason}).`));
    };

    removeAllListeners = () => {
      upstream.removeEventListener('message', upstreamMessageHandler);
      upstream.removeEventListener('error', errorHandler);
      upstream.removeEventListener('close', closeHandler);
      downstream.removeEventListener('message', downstreamMessageHandler);
      downstream.removeEventListener('error', errorHandler);
      downstream.removeEventListener('close', closeHandler);
    };
    upstream.addEventListener('message', upstreamMessageHandler);
    upstream.addEventListener('error', errorHandler);
    upstream.addEventListener('close', closeHandler);
    downstream.addEventListener('message', downstreamMessageHandler);
    downstream.addEventListener('error', errorHandler);
    downstream.addEventListener('close', closeHandler);
    upstream.send(JSON.stringify({ type: 'downstream', payload: { tunnelId } }));
    downstream.send(JSON.stringify({ type: 'upstream', payload: { tunnelId } }));
  });
}
