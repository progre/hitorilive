import { ConnectPeersServerMessage } from '../utils/connectPeersClient';
import { ConnectPeersClientMessage } from '../utils/connectPeersServer';

export interface Message {
  id: string;
  index: number;
  message: string;
}

export interface Settings {
  rtmpPort: number;
  httpPort: number;
  useUpnp: boolean;
}

export type ClientSignalingMessage = ConnectPeersClientMessage;
export type ServerSignalingMessage = (
  ConnectPeersServerMessage | UpstreamMessage | DownstreamMessage
);

export interface UpstreamMessage {
  readonly type: 'upstream';
  readonly payload: {
    readonly url?: string;
    readonly tunnelId?: string;
  };
}

export interface DownstreamMessage {
  readonly type: 'downstream';
  readonly payload: {
    readonly tunnelId: string;
  };
}
