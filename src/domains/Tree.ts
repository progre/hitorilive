import WebSocket from 'ws';

// Since most methods are recursive,
// so thier can't be included as instance methods.
interface PeerTree {
  // parent?: TreeCollection<T>;
  readonly item: Peer;
  children: ReadonlyArray<PeerTree>;
}

export interface Peer {
  id: string;
  connected: boolean;
  socket?: WebSocket;
}

export class PeerNotFoundError extends Error {
  name = 'PeerNotFoundError';
}

export default class Tree {
  static readonly ROOT = '';
  private tree: PeerTree = {
    item: { id: Tree.ROOT, connected: true },
    children: [],
  };

  joinUnderParent(client: { id: string; socket: WebSocket }) {
    return joinUnderParent(this.tree, client);
  }

  /**
   * @throws PeerNotFoundError
   */
  connect(client: { id: string }, parent: { id: string }) {
    if (connect(this.tree, client, parent)) {
      return;
    }
    remove(this.tree, client);
    throw new PeerNotFoundError();
  }

  remove(client: { id: string }) {
    remove(this.tree, client);
  }
}

function joinUnderParent(tree: PeerTree, client: { id: string; socket: WebSocket }): Peer | null {
  if (hasCapacity(tree.children)) {
    tree.children = [
      ...tree.children,
      { item: { ...client, connected: false }, children: [] },
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
  return tree.children.map(x => connect(tree, client, parent))[0] || false;
}

function remove(tree: PeerTree, client: { id: string }): void {
  tree.children = tree.children.filter(x => x.item.id !== client.id);
  tree.children.forEach((child) => {
    remove(child, client);
  });
}

function hasCapacity(child: ReadonlyArray<PeerTree>) {
  return child.length < 1;
}
