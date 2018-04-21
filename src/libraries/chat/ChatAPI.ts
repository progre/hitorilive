import { Observable } from 'rxjs';
import { Message } from './types';

export default class API {
  constructor(
    private url: string,
  ) {
  }

  async postMessage(messageData: { id: string; message: string }) {
    await fetch(
      this.url,
      {
        body: JSON.stringify(messageData),
        cache: 'no-cache',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
    );
  }

  getMessagesStream() {
    // can't work on Firefox
    // return new Observable<string>(
    //   (subscriber) => {
    //     (async () => {
    //       const res = await fetch(this.url, { cache: 'no-cache' });
    //       console.log(res.body);
    //       const reader = res.body!.getReader();
    //       for (; ;) {
    //         const { done, value } = await reader.read();
    //         if (done) {
    //           if (value != null) {
    //             throw new Error('logic error');
    //           }
    //           subscriber.complete();
    //           return;
    //         }
    //         subscriber.next(value);
    //       }
    //     })().catch((e) => { subscriber.error(e); });
    //   })
    let buffer = '';
    return new Observable<string>(
      (subscriber) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', this.url);
        xhr.onerror = (ev) => {
          console.error(new Error('Message websocket throwed an error'));
        };
        xhr.onloadend = () => {
          setTimeout(() => { subscriber.complete(); }, 3000);
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState >= 2 && xhr.status >= 400) {
            xhr.abort();
            console.error(`${xhr.status} ${xhr.statusText}`);
            return;
          }
        };
        let loadedLength = 0;
        xhr.onprogress = (e) => {
          const current = xhr.responseText.slice(loadedLength);
          loadedLength = xhr.responseText.length;
          subscriber.next(current);
        };
        xhr.send();
      })
      .repeat()
      .flatMap(x => x.split(/(.*\r)/))
      .filter(x => x.length > 0)
      .map((x) => {
        const str = buffer + x;
        if (!str.endsWith('\r')) {
          buffer = str;
          return '';
        }
        buffer = '';
        return str;
      })
      .filter(x => x.length > 0)
      .map((x) => {
        const messages = JSON.parse(x);
        if (
          !Array.isArray(messages)
          || !messages.every(
            y => (
              y.id != null
              && y.index != null
              && y.message != null
            ),
          )
        ) {
          throw new Error(`Invalid object: ${x}`);
        }
        return <ReadonlyArray<Message>>messages;
      });
  }
}
