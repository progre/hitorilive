export interface TunnelMessage {
  readonly type: 'tunnel';
  readonly payload: {
    readonly tunnelId: string;
    readonly data: any;
  };
}

export interface TunnelCompletedMessage {
  readonly type: 'tunnelCompleted';
  readonly payload: {
    readonly tunnelId: string;
  };
}
