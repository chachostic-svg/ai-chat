import { execSync } from 'node:child_process';

const port = String(process.argv[2] ?? '3001');

function freePortWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!/LISTENING/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`[free-port] остановлен процесс ${pid} на порту ${port}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* порт свободен */
  }
}

if (process.platform === 'win32') {
  freePortWindows();
}
