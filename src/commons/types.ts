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

export interface ClientSignalingMessage {
}

export type ServerSignalingMessage = WebSocketUpstream;

export interface WebSocketUpstream {
  readonly type: 'upstream';
  readonly payload: {
    readonly url: string;
  };
}
