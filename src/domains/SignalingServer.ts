import http from 'http';
import { sync as uid } from 'uid-safe';
import WebSocket from 'ws';
import { ServerSignalingMessage } from '../commons/types';
import connectPeersServer from '../utils/connectPeersServer';
import Tree, { Peer } from './Tree';

export default class SignalingServer {
  private readonly tree = new Tree();

  constructor(
    public mediaURL: string,
  ) {
  }

  async join(socket: WebSocket) {
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
      this.joinToRoot(socket, id, parent);
      return;
    }
    await this.joinToPeer(socket, id, parent);
  }

  private joinToRoot(socket: WebSocket, id: string, parent: { id: string }) {
    const message: ServerSignalingMessage = {
      type: 'upstream',
      payload: { url: this.mediaURL },
    };
    socket.send(JSON.stringify(message));
    this.tree.connect({ id }, parent);
  }

  private async joinToPeer(socket: WebSocket, id: string, parent: Peer) {
    if (parent.socket == null) {
      throw new Error('logic error');
    }
    await connectPeersServer(parent.socket, socket);
    this.tree.connect({ id }, parent);
  }
}
