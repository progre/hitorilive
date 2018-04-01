// tslint:disable-next-line:no-implicit-dependencies
import { app } from 'electron';
import fs from 'fs';
import util from 'util';
import { Settings } from '../types';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

export default class SettingsRepo {
  private path = `${app.getPath('userData')}/settings.json`;

  async get() {
    try {
      return <Settings>JSON.parse(await readFile(this.path, { encoding: 'utf8' }));
    } catch {
      return {
        rtmpPort: 1935,
        httpPort: 17144,
      };
    }
  }

  async set(data: Settings) {
    await writeFile(this.path, JSON.stringify(data), { encoding: 'utf8' });
  }
}
