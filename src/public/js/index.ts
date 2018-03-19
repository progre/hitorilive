import module from './module';

async function main() {
  await module();
}

main().catch((e) => { console.error(e.stack || e); });
