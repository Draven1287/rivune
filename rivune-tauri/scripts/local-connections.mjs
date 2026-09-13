import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { join, delimiter } from 'node:path';
import { checkClaudeReadiness } from './local-claude.mjs';

async function findBinary(name) {
  const dirs = [...(process.env.PATH || '').split(delimiter), join(homedir(), '.local/bin'), '/opt/homebrew/bin', '/usr/local/bin'];
  for (const dir of dirs.filter(Boolean)) { const path = join(dir, name); try { await access(path, constants.X_OK); return path; } catch {} }
  return null;
}
function authStatus(path, args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/API_KEY|AUTH_TOKEN|ACCESS_TOKEN/.test(key)) delete env[key];
  return new Promise(resolve => execFile(path, args, { env, timeout:8000, maxBuffer:65536, windowsHide:true }, (error, stdout, stderr) => {
    resolve({ ok: !error, timedOut: Boolean(error?.killed), text: String(stdout) + String(stderr) });
  }));
}
// This function accepts no command, path, prompt, or credential from callers.
export async function checkLocalConnections() {
  if (process.platform !== 'darwin') return ['Codex', 'Claude', 'Gemini', 'Antigravity', 'Grok'].map(name => ({ name, state: 'Local sign-in checks are not yet supported on this operating system' }));
  return Promise.all(['Codex', 'Claude', 'Gemini', 'Antigravity', 'Grok'].map(async name => {
    if (name === 'Grok') return { name, state:'No supported CLI adapter' };
    if (name === 'Claude') return checkClaudeReadiness();
    if (name === 'Antigravity') {
      try { await access('/Applications/Antigravity.app'); return { name, state:'Desktop installed · adapter planned' }; } catch {}
    }
    const path = await findBinary(name.toLowerCase());
    if (!path) return { name, state:'Not installed' };
    if (name !== 'Codex') return { name, state:'CLI installed · sign-in not checked' };
    const status = await authStatus(path, ['login','status']);
    let state = status.timedOut ? 'Check timed out' : 'Sign-in needed';
    if (name === 'Codex' && status.ok) state = /ChatGPT/i.test(status.text) ? 'ChatGPT signed in · app chat not connected' : 'Authentication found · account type unverified';
    return { name, state };
  }));
}
