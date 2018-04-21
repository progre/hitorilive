import debug from 'debug';
const log = debug('hitorilive:Store');

// tslint:disable-next-line:no-implicit-dependencies
import flvJS from 'flv.js';
import { action, observable, runInAction } from 'mobx';
import { sync as uid } from 'uid-safe';
import ChatAPI from '../../libraries/chat/ChatAPI';
import { Message } from '../../libraries/chat/types';
import createSignalingClient from './infrastructures/createSignalingClient';
import SignalingClient from './infrastructures/SignalingClient';

export default class Store {
  @observable chat = {
    messages: <ReadonlyArray<Message>>[],
  };
  @observable flvPlayer?: ReturnType<typeof flvJS.createPlayer>;

  private api = new ChatAPI('/api/v1/messages');
  private signalingClient!: SignalingClient;

  constructor() {
    this.api.getMessagesStream().subscribe(
      (x) => { this.addMessages(x); },
      handleError,
    );
    this.initSignalingClient();
  }

  postMessage(message: string) {
    this.api.postMessage({ message, id: uid(16) }).catch(handleError);
  }

  @action
  cleanUpPlayer() {
    this.flvPlayer = undefined;
    this.initSignalingClient();
  }

  private initSignalingClient() {
    createSignalingClient(location.host).subscribe(
      (signalingClient) => {
        this.signalingClient = signalingClient;
        this.signalingClient.onClose.subscribe(() => {
          log('SignalingClient closed. retry....');
          this.cleanUpPlayer();
        });
        runInAction(() => {
          this.flvPlayer = this.signalingClient.flvPlayer;
        });
      },
      (err) => {
        handleError(err);
        setTimeout(
          () => { this.initSignalingClient(); },
          3000,
        );
      },
    );
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
