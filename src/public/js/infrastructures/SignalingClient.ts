import flvJS from 'flv.js';
import { Subject } from 'rxjs';

export type FLVPlayer = ReturnType<typeof flvJS.createPlayer>;

export default class SignalingClient {
  readonly onClose = new Subject<void>();

  static async create(host: string) {
    const { webSocket, data: { type, payload } } = await new Promise<any>((resolve, reject) => {
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
    return new this(
      webSocket,
      flvJS.createPlayer(
        {
          url: payload.url,
          type: 'flv',
        },
        {
          isLive: true,
        },
      ),
    );
  }

  private constructor(
    webSocket: WebSocket,
    public flvPlayer: FLVPlayer,
  ) {
    // Probably no error is thrown after opening.
    webSocket.onerror = (ev) => {
      webSocket.onerror = null;
      webSocket.close();
    };
    webSocket.onclose = (ev) => {
      webSocket.onclose = null;
      this.onClose.next();
      this.onClose.complete();
    };
  }
}
