import { spawn } from 'node:child_process';
import path from 'node:path';

const rawArgs = process.argv.slice(2);
const nextArgs = ['dev'];
let hasPort = false;
let hasHost = false;

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    hasHost = true;
    nextArgs.push('-H');
    if (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-')) {
      nextArgs.push(rawArgs[i + 1]);
      i += 1;
    } else {
      nextArgs.push('0.0.0.0');
    }
  } else if (arg.startsWith('--host=')) {
    hasHost = true;
    nextArgs.push('-H', arg.slice('--host='.length) || '0.0.0.0');
  } else if (arg === '-H' || arg === '--hostname') {
    hasHost = true;
    nextArgs.push(arg);
    if (rawArgs[i + 1]) {
      nextArgs.push(rawArgs[i + 1]);
      i += 1;
    }
  } else if (arg === '-p' || arg === '--port') {
    hasPort = true;
    nextArgs.push(arg);
    if (rawArgs[i + 1]) {
      nextArgs.push(rawArgs[i + 1]);
      i += 1;
    }
  } else if (arg.startsWith('--port=')) {
    hasPort = true;
    nextArgs.push('-p', arg.slice('--port='.length) || '3000');
  } else {
    nextArgs.push(arg);
  }
}

if (!hasPort) {
  nextArgs.push('-p', process.env.PORT || '3000');
}
if (!hasHost) {
  nextArgs.push('-H', '0.0.0.0');
}

const nextBin = path.resolve(process.cwd(), 'node_modules/.bin/next');
const child = spawn(nextBin, nextArgs, {
  stdio: 'inherit',
  env: process.env,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
