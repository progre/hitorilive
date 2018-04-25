// tslint:disable-next-line:no-implicit-dependencies
import { IpcRenderer } from 'electron';
import { action, observable, runInAction } from 'mobx';
import { Settings } from '../../commons/types';

export default class Store {
  @observable settings: Settings;
  @observable latestError?: string;
  @observable listeners = 0;
  @observable bps = 0;

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

    setInterval(
      async () => {
        let bps: number;
        try {
          bps = await fetchBPS(this.settings.httpPort);
        } catch (err) {
          bps = 0;
        }
        runInAction(() => {
          this.bps = bps;
        });
      },
      1000,
    );
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

async function fetchBPS(httpPort: number) {
  const res = await fetch(`http://127.0.0.1:${httpPort}/api/streams/`);
  const json = await res.json();
  const publisher = json.live[''].publisher;
  const elapsedTimeSeconds = (
    (Date.now() - new Date(publisher.connectCreated).getTime()) / 1000
  );
  const bits = publisher.bytes * 8;
  return bits / elapsedTimeSeconds;
}
