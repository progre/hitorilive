import http from 'http';
import { sync as uid } from 'uid-safe';
import WebSocket from 'ws';
import Tree from './Tree';

export default class SignalingServer {
  private readonly tree = new Tree();

  constructor(
    public mediaURL: string,
  ) {
  }

  join(socket: WebSocket) {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error('logic error');
    }
    const id = uid(16);
    socket.on('close', () => {
      this.tree.remove({ id });
    });
    socket.on('error', (err) => {
      console.error(err.stack || err);
    });
    const parent = this.tree.joinUnderParent({ id, socket });
    if (parent == null) {
      socket.close(509, http.STATUS_CODES[509]);
      return;
    }
    if (parent.id === Tree.ROOT) {
      socket.send(JSON.stringify({ type: 'upstream', payload: { url: this.mediaURL } }));
      this.tree.connect({ id }, parent);
      return;
    }
    throw new Error('not implemented');
  }
}
