import { Observable } from 'rxjs';
import Peer from 'simple-peer';
import { TunnelCompletedMessage, TunnelMessage } from './connectPeersTypes';
export type ConnectPeersServerMessage = TunnelMessage;

export default function connectPeersClient(
  webSocket: WebSocket,
  tunnelId: string,
  opts: Peer.Options,
) {
  return new Observable<Peer.Instance>((subscribe) => {
    try {
      const peer = new Peer(opts);
      const signalHandler = (signal: any) => {
        webSocket.send(JSON.stringify({
          type: 'tunnel',
          payload: { tunnelId, data: signal },
        }));
      };
      peer.on('signal', signalHandler);
      const messageHandler = (ev: MessageEvent) => {
        const data: TunnelMessage = JSON.parse(ev.data);
        if (data.type !== 'tunnel' || data.payload.tunnelId !== tunnelId) {
          return;
        }
        peer.signal(data.payload.data);
      };
      webSocket.addEventListener('message', messageHandler);
      let removeAllListeners: Function;
      const connectHandler = () => {
        removeAllListeners();
        // tslint:disable-next-line:no-object-literal-type-assertion
        webSocket.send(JSON.stringify(<TunnelCompletedMessage>{
          type: 'tunnelCompleted',
          payload: { tunnelId },
        }));
        subscribe.next(peer);
        subscribe.complete();
      };
      peer.once('connect', connectHandler);
      const errorHandler = (err: Error) => {
        removeAllListeners();
        subscribe.error(err);
      };
      peer.once('error', errorHandler);
      removeAllListeners = () => {
        peer.removeListener('signal', signalHandler);
        webSocket.removeEventListener('message', messageHandler);
        peer.removeListener('connect', connectHandler);
        peer.removeListener('error', errorHandler);
      };
    } catch (err) {
      subscribe.error(err);
    }
  });
}
