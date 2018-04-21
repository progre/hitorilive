// tslint:disable-next-line:no-implicit-dependencies
import { IpcRenderer } from 'electron';
import { action, observable } from 'mobx';
import { Settings } from '../../commons/types';

export default class Store {
  @observable settings: Settings;
  @observable latestError?: string;
  @observable listeners = 0;

  constructor(settings: Settings, private ipcRenderer: IpcRenderer) {
    this.settings = settings;

    ipcRenderer.on('setSettings', action((_: any, value: Settings) => {
      this.settings = value;
    }));

    ipcRenderer.on('error', action((_: any, value: string) => {
      this.latestError = value;
    }));

    ipcRenderer.on('setListeners', action((_: any, value: number) => {
      this.listeners = value;
    }));
  }

  setEnableP2PStreamRelay(value: boolean) {
    this.ipcRenderer.send('setEnableP2PStreamRelay', value);
  }

  setDirectlyConnectionLimit(value: number) {
    this.ipcRenderer.send('setDirectlyConnectionLimit', value);
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
