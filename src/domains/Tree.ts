import debug from 'debug';
const log = debug('hitorilive:Tree');
import { Subject } from 'rxjs';
import WebSocket from 'ws';

// Since most methods are recursive,
// so thier can't be included as instance methods.
export interface PeerTree {
  // parent?: TreeCollection<T>;
  readonly item: Peer;
  children: ReadonlyArray<PeerTree>;
}

export interface Peer {
  id: string;
  capacity: number;
  connected: boolean;
  socket?: WebSocket;
}

export class PeerNotFoundError extends Error {
  name = 'PeerNotFoundError';
}

export default class Tree {
  static readonly ROOT = '';
  private tree: PeerTree = {
    item: { id: Tree.ROOT, capacity: 1, connected: true },
    children: [],
  };

  readonly onChildrenCountUpdate = new Subject<{ count: number }>();

  getRoot() {
    return this.tree;
  }

  joinUnderParent(client: { id: string; socket: WebSocket }) {
    if (log.enabled) {
      log(`client joining. count: ${this.count() + 1}`);
    }
    return joinUnderParent(this.tree, client);
  }

  /**
   * @throws PeerNotFoundError
   */
  connect(client: { id: string }, parent: { id: string }) {
    if (!connect(this.tree, client, parent)) {
      remove(this.tree, client);
      throw new PeerNotFoundError();
    }
    const cnt = this.count();
    log(`client connected. count: ${cnt}`);
    this.onChildrenCountUpdate.next({ count: cnt });
  }

  remove(client: { id: string }) {
    remove(this.tree, client);
    const cnt = this.count();
    log(`client removed. count: ${cnt}`);
    this.onChildrenCountUpdate.next({ count: cnt });
  }

  count() {
    return count(this.tree) - 1;
  }
}

function joinUnderParent(tree: PeerTree, client: { id: string; socket: WebSocket }): Peer | null {
  if (hasCapacity(tree)) {
    tree.children = [
      ...tree.children,
      { item: { ...client, capacity: 1, connected: false }, children: [] },
    ];
    return tree.item;
  }
  return tree.children.map(x => joinUnderParent(x, client)!)
    .filter(x => x != null)[0];
}

function connect(
  tree: PeerTree,
  client: { id: string },
  parent: { id: string },
): boolean {
  if (tree.item.id === parent.id) {
    const one = tree.children
      .filter(x => x.item.id === client.id)
      .map(x => x.item);
    if (one.length !== 1) {
      return false;
    }
    one[0].connected = true;
    return true;
  }
  return tree.children.map(x => connect(x, client, parent))[0] || false;
}

function remove(tree: PeerTree, client: { id: string }): void {
  tree.children = tree.children.filter(x => x.item.id !== client.id);
  tree.children.forEach((child) => {
    remove(child, client);
  });
}

function hasCapacity(tree: PeerTree) {
  return tree.children.length < tree.item.capacity;
}

function count(tree: Readonly<PeerTree>): number {
  return 1 + tree.children.map(count).reduce((p, c) => p + c, 0);
}
