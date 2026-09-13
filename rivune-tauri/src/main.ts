import './styles/tokens.css';
import './style.css';
import './styles/everyday-workspace.css';
import './styles/observatory.css';
import './styles/intelligence.css';
import './styles/reading-focus.css';
import './styles/plain-workspace.css';
import './styles/conversation-search.css';
import './styles/gateway-preview.css';
import './styles/worlds.css';
import './styles/conversation-handling.css';
import './styles/stillwater-shell.css';
import './components/shared/ambientDepth.js';
import { platform } from './platform/index.js';

async function start(): Promise<void> {
  await platform.initialize();
  document.documentElement.dataset.platform = platform.name;
  await import('./app/workspaceApp');
}
void start();
