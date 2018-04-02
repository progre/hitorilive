# HitoriLive
[![Build Status](https://travis-ci.org/progre/hitorilive.svg?branch=master)](https://travis-ci.org/progre/hitorilive)

Live broadcasting without a server for everyone.

* This version is still expermental. You need to do NAT traversal (eg, UPnP) yourself.

## Usage

1. Execute # HitoriLive first
2. Set RTMP port (to connect from OBS) and set HTTP port (to connect from browser)
3. Start OBS broadcast to `rtmp://localhost:[set RTMP port]/live`
4. Open `http://[your ip address]:[set HTTP port]/` in browser of you or your friends

### [Download](https://github.com/progre/hitorilive/releases)

----

## Build

```
$ npm install
$ npm run build
$ npm run package
```

## Resources

- [App icon](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html#foreground.type=text&foreground.text.text=%E2%97%80%29%29&foreground.text.font=Mouse%20Memoirs&foreground.space.trim=1&foreground.space.pad=0.15&foreColor=rgb(64%2C%2064%2C%2064)&backColor=rgb(248%2C%20248%2C%20248)&crop=0&backgroundShape=circle&effects=none&name=ic_launcher)
  - Convert with:
    - https://convertio.co/ja/png-converter/
    - https://iconverticons.com/online/
