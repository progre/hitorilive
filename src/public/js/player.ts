const flvJS = require('flv.js').default;

class VideoWrapper {
  constructor(
    window: Window,
    video: HTMLVideoElement,
    private noSignalBlock: HTMLDivElement,
  ) {
    this.onPlay = this.onPlay.bind(this);
    this.onStop = this.onStop.bind(this);

    video.volume = 0.5;
    video.addEventListener('loadedmetadata', this.onPlay);
    video.addEventListener('emptied', this.onStop);
  }

  private onPlay() {
    this.noSignalBlock.style.display = 'none';
  }

  private onStop() {
    this.noSignalBlock.style.display = null;
  }
}

export async function start() {
  const video = <HTMLVideoElement>document.getElementById('video');
  // tslint:disable-next-line:no-unused-expression
  new VideoWrapper(
    window,
    <HTMLVideoElement>document.getElementById('video'),
    <HTMLDivElement>document.getElementById('no-signal'),
  );
  for (; ;) {
    await startPlayer(video, location.host);
  }
}

async function startPlayer(element: HTMLVideoElement, host: string) {
  const flvPlayer = flvJS.createPlayer({
    isLive: true,
    type: 'flv',
    url: `ws://${host}/live/.flv`,
  });
  flvPlayer.attachMediaElement(element);
  flvPlayer.load();
  await new Promise((resolve, reject) => {
    flvPlayer.play();
    flvPlayer.on(flvJS.Events.LOADING_COMPLETE, resolve);
  });
  flvPlayer.destroy();
}
