const { execSync, spawn } = require('child_process');
const net = require('net');

function isAlive() {
  return new Promise(resolve => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => { s.close(); resolve(false); });
    s.listen(3000, () => { s.close(); resolve(true); });
  });
}

async function startServer() {
  console.log('[watcher] Starting dev server...');
  const child = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('exit', () => {
    console.log('[watcher] Server exited, restarting in 2s...');
    setTimeout(startServer, 2000);
  });
}

async function main() {
  while (true) {
    try {
      const alive = await isAlive();
      if (!alive) {
        console.log('[watcher] Port 3000 free, starting server...');
        await startServer();
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 2000));
  }
}
main();
