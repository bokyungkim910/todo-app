const { spawn } = require('child_process');
const path = require('path');

const vitePath = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn('node', [vitePath, '--host'], {
  detached: true,
  stdio: 'ignore'
});

child.unref();

console.log('Server started on http://localhost:5173');
console.log('Process ID:', child.pid);
