import Peer from 'simple-peer';
import { TunnelMessage } from './connectPeersTypes';
export type ConnectPeersServerMessage = TunnelMessage;

export default async function connectPeersClient(
  webSocket: WebSocket,
  tunnelId: string,
  opts: Peer.Options,
) {
  return new Promise<Peer.Instance>((resolve, reject) => {
    const peer = new Peer(opts);
    const signalHandler = (signal: any) => {
      webSocket.send(JSON.stringify({
        type: 'tunnel',
        payload: { tunnelId, data: signal },
      }));
    };
    peer.on('signal', signalHandler);
    const messageHandler = (ev: MessageEvent) => {
      const data: ConnectPeersServerMessage = JSON.parse(ev.data);
      if (data.type !== 'tunnel' || data.payload.tunnelId !== tunnelId) {
        return;
      }
      peer.signal(data.payload.data);
    };
    webSocket.addEventListener('message', messageHandler);
    let removeAllListeners: Function;
    const connectHandler = () => {
      removeAllListeners();
      webSocket.send(JSON.stringify({
        type: 'tunnelComplete',
        payload: { tunnelId },
      }));
      resolve(peer);
    };
    peer.once('connect', connectHandler);
    const errorHandler = (err: Error) => {
      removeAllListeners();
      reject(err);
    };
    peer.once('error', errorHandler);
    removeAllListeners = () => {
      peer.removeListener('signal', signalHandler);
      webSocket.removeEventListener('message', messageHandler);
      peer.removeListener('connect', connectHandler);
      peer.removeListener('error', errorHandler);
    };
  });
}
