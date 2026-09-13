import { defineConfig } from 'vite';
import { checkLocalConnections } from './scripts/local-connections.mjs';
import { createClaudeChatMiddleware, isLocalRequest } from './scripts/local-claude.mjs';

export default defineConfig({
  plugins: [{
    name:'rivune-local-connection-checks',
    configureServer(server) {
      server.middlewares.use('/__rivune/claude/chat', createClaudeChatMiddleware());
      let pending;
      server.middlewares.use('/__rivune/connections', async (request, response) => {
        response.setHeader('Content-Type','application/json'); response.setHeader('Cache-Control','no-store');
        if (!isLocalRequest(request, 'x-rivune-local-check')) { response.statusCode=403; response.end(JSON.stringify({error:'Local app check only'})); return; }
        try {
          pending ||= checkLocalConnections().finally(() => { pending=undefined; });
          response.end(JSON.stringify(await pending));
        } catch { response.statusCode=500; response.end(JSON.stringify({error:'Could not check connections'})); }
      });
    }
  }]
});
