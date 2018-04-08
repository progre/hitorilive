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
    const rawJSON = await readFile(this.path, { encoding: 'utf8' });
    const json = (() => {
      try {
        return JSON.parse(rawJSON);
      } catch {
        return {};
      }
    })();
    return {
      rtmpPort: json.rtmpPort != null ? json.rtmpPort : 1935,
      httpPort: json.httpPort != null ? json.httpPort : 17144,
      useUpnp: json.useUpnp != null ? json.useUpnp : true,
    };
  }

  async set(data: Settings) {
    await writeFile(this.path, JSON.stringify(data), { encoding: 'utf8' });
  }
}
