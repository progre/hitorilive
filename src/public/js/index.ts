import { start } from './player';

async function main() {
  await start();
}

main().catch((e) => { console.error(e.stack || e); });
