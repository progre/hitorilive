// tslint:disable:no-implicit-dependencies
try { require('source-map-support').install(); } catch (e) { /* NOP */ }
import { app, BrowserWindow } from 'electron';
// tslint:enable:no-implicit-dependencies
import LiveServer from './LiveServer';
import SettingsRepo from './SettingsRepo';

async function main() {
  await new Promise((resolve, reject) => app.once('ready', resolve));

  const settingsRepo = new SettingsRepo();
  const settings = await settingsRepo.get();

  app.on('window-all-closed', app.quit.bind(app));
  const win = new BrowserWindow({
    width: 320,
    height: 120,
    resizable: true,
    show: false,
  });
  win.on('ready-to-show', () => {
    win.show();
  });
  win.loadURL(`file://${__dirname}/local/index.html#${JSON.stringify(settings)}`);
  const server = new LiveServer();
  if (settings.rtmpPort != null && settings.httpPort != null) {
    const { error } = await server.setPort(settings.rtmpPort, settings.httpPort);
    if (error != null) {
      console.error(error.reason);
    }
  }
}

main().catch((e) => { console.error(e.stack || e); });
