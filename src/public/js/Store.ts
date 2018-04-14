// tslint:disable-next-line:no-implicit-dependencies
import flvJS from 'flv.js';
import { action, observable, runInAction } from 'mobx';
import { sync as uid } from 'uid-safe';
import { Message } from '../../commons/types';
import API from './infrastructures/API';
import SignalingClient from './infrastructures/SignalingClient';

export default class Store {
  @observable chat = {
    messages: <ReadonlyArray<Message>>[],
  };
  @observable flvPlayer?: ReturnType<typeof flvJS.createPlayer>;

  private api = new API();
  private signalingClient!: SignalingClient;

  constructor() {
    this.api.getMessagesStream().subscribe(
      (x) => { this.addMessages(x); },
      handleError,
    );
    this.initSignalingClient().catch(handleError);
  }

  postMessage(message: string) {
    this.api.postMessage({ message, id: uid(16) }).catch(handleError);
  }

  @action
  cleanUpPlayer() {
    this.flvPlayer = undefined;
    this.initSignalingClient().catch(handleError);
  }

  private async initSignalingClient(): Promise<void> {
    try {
      this.signalingClient = await SignalingClient.create(location.host);
      this.signalingClient.onClose.subscribe(() => { this.cleanUpPlayer(); });
    } catch (err) {
      handleError(err);
      await new Promise((resolve, reject) => { setTimeout(resolve, 3000); });
      return this.initSignalingClient();
    }
    runInAction(() => {
      this.flvPlayer = this.signalingClient.flvPlayer;
    });
  }

  @action
  private addMessages(messages: ReadonlyArray<Message>) {
    const currentMessages = this.chat.messages;
    const newMessages = [
      ...currentMessages,
      ...messages.filter(x => currentMessages.every(y => y.id !== x.id)),
    ].slice(-1000); // limit 1000
    this.chat = {
      ...this.chat,
      messages: newMessages,
    };
  }
}

function handleError(e: Error) {
  console.error(`${e.message || e.toString()} ${e.stack || e}`);
}
