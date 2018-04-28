import flvJS, { MediaSegment } from 'flv.js';
import { Observable, Subscription } from 'rxjs';
const { LoaderErrors, LoaderStatus } = flvJS;

export default class ObservableLoader extends flvJS.BaseLoader {
  private requestAbort = false;
  private receivedLength = 0;
  private subscription?: Subscription;

  constructor(
    private observable: Observable<ArrayBuffer>,
  ) {
    super('observable-loader');
    this._needStash = true;
  }

  destroy() {
    this.abort();
    super.destroy();
  }

  open(dataSource: MediaSegment) {
    this.subscription = this.observable.subscribe(
      (data) => {
        this.dispatchArrayBuffer(data);
      },
      (err) => {
        this._status = LoaderStatus.kError;

        const info = {
          code: err.code,
          msg: err.message,
        };

        if (this.onError) {
          this.onError(LoaderErrors.EXCEPTION, info);
        } else {
          throw new Error(info.msg);
        }
      },
      () => {
        if (this.requestAbort) {
          this.requestAbort = false;
          return;
        }

        this._status = LoaderStatus.kComplete;

        if (this.onComplete) {
          this.onComplete(0, this.receivedLength - 1);
        }
      },
    );

    this._status = LoaderStatus.kBuffering;
  }

  abort() {
    if (this.subscription != null) {
      this.subscription.unsubscribe();
    }
    this.requestAbort = true;
    this._status = LoaderStatus.kComplete;
  }

  private dispatchArrayBuffer(arraybuffer: ArrayBuffer) {
    if (this._status !== LoaderStatus.kIdle && !this.isWorking()) {
      throw new Error('logic error');
    }
    const chunk = arraybuffer;
    const byteStart = this.receivedLength;
    this.receivedLength += chunk.byteLength;

    if (this.onDataArrival) {
      this.onDataArrival(chunk, byteStart, this.receivedLength);
    }
  }
}
