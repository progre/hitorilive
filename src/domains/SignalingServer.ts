import debug from 'debug';
const log = debug('hitorilive:SignalingServer');
import http from 'http';
import { Observable } from 'rxjs';
import { sync as uid } from 'uid-safe';
import WebSocket from 'ws';
import { ServerSignalingMessage } from '../commons/types';
import connectPeersServer, {
  SocketClosedError,
} from '../libraries/peerconnection/connectPeersServer';
import Tree, { Peer } from './Tree';

export default class SignalingServer {
  private readonly tree = new Tree();
  private tunnelCount = 0;

  readonly onListenerUpdate: Observable<{ count: number }> = this.tree.onChildrenCountUpdate;

  constructor(
    private readonly mediaPath: string,
  ) {
  }

  setDirectlyConnectionLimit(capacity: number) {
    this.tree.getRoot().item.capacity = capacity;
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
    try {
      this.tunnelCount += 1;
      log(`tunnelCount: ${this.tunnelCount}`);
      await this.joinToPeer(socket, id, parent);
    } catch (e) {
      if (e instanceof SocketClosedError) {
        log(e.message);
        socket.close();
        return;
      }
      throw e;
    } finally {
      this.tunnelCount -= 1;
      log(`tunnelCount: ${this.tunnelCount}`);
    }
  }

  private joinToRoot(socket: WebSocket, id: string, parent: { id: string }) {
    const message: ServerSignalingMessage = {
      type: 'upstream',
      payload: { path: this.mediaPath },
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
