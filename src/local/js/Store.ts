// tslint:disable-next-line:no-implicit-dependencies
import { IpcRenderer } from 'electron';
import { action, observable } from 'mobx';
import { Settings } from '../../types';

export default class Store {
  @observable rtmpPort?: number;
  @observable httpPort?: number;
  @observable useUpnp?: boolean;
  @observable latestError?: string;
  @observable listeners = 0;

  constructor(settings: Settings, private ipcRenderer: IpcRenderer) {
    this.rtmpPort = settings.rtmpPort;
    this.httpPort = settings.httpPort;
    this.useUpnp = settings.useUpnp;

    ipcRenderer.on('setSettings', action((_: any, value: Settings) => {
      this.rtmpPort = value.rtmpPort;
      this.httpPort = value.httpPort;
      this.useUpnp = value.useUpnp;
    }));

    ipcRenderer.on('error', action((_: any, value: string) => {
      this.latestError = value;
    }));

    ipcRenderer.on('setListeners', action((_: any, value: number) => {
      this.listeners = value;
    }));
  }

  setRTMPPort(value: number) {
    this.ipcRenderer.send('setRTMPPort', value);
  }

  setHTTPPort(value: number) {
    this.ipcRenderer.send('setHTTPPort', value);
  }

  setUseUpnpPortMapping(value: boolean) {
    this.ipcRenderer.send('setUseUpnpPortMapping', value);
  }

  @action clearError() {
    this.latestError = undefined;
  }
}
