const { spawn } = require('child_process');

function run(command, args, name) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return child;
}

const backend = run('npm', ['run', 'backend:demo'], 'backend');
const frontend = run('npm', ['run', 'frontend'], 'frontend');

function shutdown() {
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

