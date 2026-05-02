const { spawn } = require('child_process');
const fs = require('fs');
const logFile = '/home/z/my-project/dev.log';

function startServer() {
  const child = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });
  
  child.stdout.on('data', (data) => {
    const msg = data.toString();
    process.stdout.write(msg);
    fs.appendFileSync(logFile, msg);
  });
  
  child.stderr.on('data', (data) => {
    const msg = data.toString();
    process.stderr.write(msg);
    fs.appendFileSync(logFile, msg);
  });
  
  child.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
  
  child.on('error', (err) => {
    console.error('Server error:', err);
    setTimeout(startServer, 2000);
  });
}

fs.writeFileSync(logFile, '');
startServer();
