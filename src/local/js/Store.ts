// tslint:disable-next-line:no-implicit-dependencies
import { IpcRenderer } from 'electron';
import { action, observable } from 'mobx';
import { sync as uid } from 'uid-safe';
import { Message, Settings } from '../../commons/types';

export default class Store {
  // TODO: object化。?はいらなそう
  @observable rtmpPort?: number;
  @observable httpPort?: number;
  @observable useUpnp?: boolean;
  @observable enableP2PStreamRelay!: boolean;
  @observable directlyConnectionLimit!: number;
  @observable latestError?: string;
  @observable listeners = 0;
  @observable chat = {
    messages: <ReadonlyArray<Message>>[],
  };

  constructor(settings: Settings, private ipcRenderer: IpcRenderer) {
    this.setSettings(settings);

    ipcRenderer.on('setSettings', action((_: any, value: Settings) => {
      this.setSettings(value);
    }));

    ipcRenderer.on('error', action((_: any, value: string) => {
      this.latestError = value;
    }));

    ipcRenderer.on('setListeners', action((_: any, value: number) => {
      this.listeners = value;
    }));

    ipcRenderer.on('addMessage', action((_: any, message: Message) => {
      const currentMessages = this.chat.messages;
      if (currentMessages.some(x => x.id === message.id)) {
        return;
      }
      const newMessages = [
        ...currentMessages,
        message,
      ].slice(-1000); // limit 1000
      this.chat = {
        ...this.chat,
        messages: newMessages,
      };
    }));
  }

  private setSettings(settings: Settings) {
    this.rtmpPort = settings.rtmpPort;
    this.httpPort = settings.httpPort;
    this.useUpnp = settings.useUpnp;
    this.enableP2PStreamRelay = settings.enableP2PStreamRelay;
    this.directlyConnectionLimit = settings.directlyConnectionLimit;
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

  setEnableP2PStreamRelay(value: boolean) {
    this.ipcRenderer.send('setEnableP2PStreamRelay', value);
  }

  setDirectlyConnectionLimit(value: number) {
    this.ipcRenderer.send('setDirectlyConnectionLimit', value);
  }

  @action clearError() {
    this.latestError = undefined;
  }

  postMessage(message: string) {
    this.ipcRenderer.send('addMessage', { message, id: uid(16) });
  }
}
