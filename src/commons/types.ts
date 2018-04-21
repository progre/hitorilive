import {
  ConnectPeersClientMessage,
  ConnectPeersServerMessage,
} from '../libraries/peerconnection/types';

// This should define properties flat for compatibility.
export interface Settings {
  rtmpPort: number;
  httpPort: number;
  useUpnp: boolean;
  enableP2PStreamRelay: boolean;
  directlyConnectionLimit: number;
}

export type ClientSignalingMessage = ConnectPeersClientMessage;
export type ServerSignalingMessage = (
  ConnectPeersServerMessage | UpstreamMessage | DownstreamMessage
);

export interface UpstreamMessage {
  readonly type: 'upstream';
  readonly payload: {
    readonly path?: string;
    readonly tunnelId?: string;
  };
}

export interface DownstreamMessage {
  readonly type: 'downstream';
  readonly payload: {
    readonly tunnelId: string;
  };
}
