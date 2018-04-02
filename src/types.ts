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
