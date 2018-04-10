import flvJS from 'flv.js';

export type FLVPlayer = ReturnType<typeof flvJS.createPlayer>;

export default class SignalingClient {
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

  constructor(
    webSocket: WebSocket,
    public flvPlayer: FLVPlayer,
  ) {
  }
}
