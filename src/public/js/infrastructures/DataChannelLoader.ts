import flvJS, { MediaSegment } from 'flv.js';
import Peer from 'simple-peer';
const { LoaderErrors, LoaderStatus } = flvJS;

export default class DataChannelLoader extends flvJS.BaseLoader {
  private requestAbort = false;
  private receivedLength = 0;

  constructor(private peer: Peer.Instance) {
    super('data-channel-loader');

    this._needStash = true;
    this.peer.on('close', () => {
      if (this.requestAbort) {
        this.requestAbort = false;
        return;
      }

      this._status = LoaderStatus.kComplete;

      if (this.onComplete) {
        this.onComplete(0, this.receivedLength - 1);
      }
    });
    this.peer.on('error', (err) => {
      this._status = LoaderStatus.kError;

      const info = {
        code: (<any>err).code,
        msg: err.message,
      };

      if (this.onError) {
        this.onError(LoaderErrors.EXCEPTION, info);
      } else {
        throw new Error(info.msg);
      }
    });
  }

  destroy() {
    this.abort();
    super.destroy();
  }

  open(dataSource: MediaSegment) {
    this._status = LoaderStatus.kBuffering;
    this.peer.on('data', (data: Buffer) => {
      this.dispatchArrayBuffer(<ArrayBuffer>data.buffer);
    });
  }

  abort() {
    this.peer.destroy();
    this.requestAbort = true;
    this._status = LoaderStatus.kComplete;
  }

  private dispatchArrayBuffer(arraybuffer: ArrayBuffer) {
    const chunk = arraybuffer;
    const byteStart = this.receivedLength;
    this.receivedLength += chunk.byteLength;

    if (this.onDataArrival) {
      this.onDataArrival(chunk, byteStart, this.receivedLength);
    }
  }
}
