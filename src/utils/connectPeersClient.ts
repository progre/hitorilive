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
    peer.on('signal', (signal: any) => {
      console.log('send', signal);
      webSocket.send(JSON.stringify({
        type: 'tunnel',
        payload: { tunnelId, data: signal },
      }));
    });
    const messageHandler = (ev: MessageEvent) => {
      const data: ConnectPeersServerMessage = JSON.parse(ev.data);
      if (data.type !== 'tunnel' || data.payload.tunnelId !== tunnelId) {
        return;
      }
      console.log('recv', data.payload.data);
      peer.signal(data.payload.data);
    };
    webSocket.addEventListener('message', messageHandler);
    const removeAllListeners = () => {
      peer.removeAllListeners('signal');
      webSocket.removeEventListener('message', messageHandler);
      peer.removeAllListeners('connect');
      peer.removeAllListeners('error');
    };
    peer.once('connect', () => {
      removeAllListeners();
      webSocket.send(JSON.stringify({
        type: 'tunnelComplete',
        payload: { tunnelId },
      }));
      resolve(peer);
    });
    peer.once('error', (err: Error) => {
      removeAllListeners();
      reject(err);
    });
  });
}
