// tslint:disable-next-line:no-implicit-dependencies
import { app } from 'electron';
import fs from 'fs';
import util from 'util';
import { Settings } from '../commons/types';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

export default class SettingsRepo {
  private path = `${app.getPath('userData')}/settings.json`;

  async get(): Promise<Settings> {
    const json = await (async () => {
      try {
        const rawJSON = await readFile(this.path, { encoding: 'utf8' });
        return JSON.parse(rawJSON);
      } catch {
        return {};
      }
    })();
    return {
      rtmpPort: valueOrDefault(json.rtmpPort, 1935),
      httpPort: valueOrDefault(json.httpPort, 17144),
      useUpnp: valueOrDefault(json.useUpnp, true),
      enableP2PStreamRelay: valueOrDefault(json.enableP2PStreamRelay, false),
      directlyConnectionLimit: valueOrDefault(json.directlyConnectionLimit, 10),
    };
  }

  async set(data: Settings) {
    await writeFile(this.path, JSON.stringify(data), { encoding: 'utf8' });
  }
}

function valueOrDefault<T>(value: T, def: T) {
  return value != null ? value : def;
}
