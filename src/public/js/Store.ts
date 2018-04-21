import debug from 'debug';
const log = debug('hitorilive:Store');

// tslint:disable-next-line:no-implicit-dependencies
import flvJS from 'flv.js';
import { action, observable, runInAction } from 'mobx';
import createSignalingClient from './infrastructures/createSignalingClient';
import SignalingClient from './infrastructures/SignalingClient';

export default class Store {
  @observable flvPlayer?: ReturnType<typeof flvJS.createPlayer>;

  private signalingClient!: SignalingClient;

  constructor() {
    this.initSignalingClient();
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
}

function handleError(e: Error) {
  console.error(`${e.message || e.toString()} ${e.stack || e}`);
}
