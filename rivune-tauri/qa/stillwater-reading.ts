import '../src/styles/tokens.css';
import '../src/style.css';
import '../src/styles/everyday-workspace.css';
import '../src/styles/observatory.css';
import '../src/styles/intelligence.css';
import '../src/styles/reading-focus.css';
import '../src/styles/plain-workspace.css';
import '../src/styles/conversation-search.css';
import '../src/styles/gateway-preview.css';
import '../src/styles/worlds.css';

import { mountAppShell } from '../src/app/app-shell/index.js';
import { mountWorlds } from '../src/features/worlds/renderer.js';
import { renderAnswer } from '../src/components/shared/answerFormat.js';
// Local-only visual fixture. No storage, provider calls, or production entry-point import.
mountAppShell();
const root = document.documentElement;
Object.assign(root.dataset, {backdrop:'ocean',worldScene:'ocean',worlds:'true',motion:'off',environment:'focused'});
mountWorlds();
document.querySelector('.hero')!.setAttribute('hidden','');
document.querySelector('.suggestions')!.setAttribute('hidden','');
document.querySelector('.breadcrumbs > span')!.textContent='Stillwater · reading fixture';
document.querySelector('#environment-menu')!.textContent='Stillwater';
const conversation=document.querySelector<HTMLElement>('#conversation')!; conversation.hidden=false;
const turns = [
 ['You · visual test', 'How should we preserve a conversation when one of the connected providers stops responding?'],
 ['Example response · authored fixture', `## Keep the conversation dependable

A conversation should remain readable even when a connection is interrupted. Preserve everything the person has written, keep the last completed answer intact, and explain the next available action close to the unfinished response. The surrounding environment should stay still throughout this process.

### Save before sending

Save the draft and its conversation identifier before starting a provider request. If storage fails, keep the prompt in the composer and explain that it has not been sent. Retrying should create a single new attempt, with the previous partial response available for reference.

- Keep completed answers in chronological order.
- Show an explicit stopped or interrupted state.
- Resume only after the user chooses to continue.

### A small implementation example

CODE

The important boundary is the saved message. A network interruption can stop an attempt, but it must not erase the person's work. The code area can scroll horizontally without making the entire conversation wider.`],
 ['You · visual test', 'What should the user see when they return?'],
 ['Second response · authored fixture', `## A clear place to continue

Reopen the same conversation and restore the draft. Show the last completed response first, followed by the interrupted attempt and a concise action to retry. Do not replay the request automatically: the user should decide whether another call is useful.

The environment remains visible around the reading surface. Its horizon and reflections never pass through the text, and scrolling a long answer does not move the camera.

> Keep the atmosphere around the work, and the work itself stable.

This second response verifies paragraph spacing, repeated response labels, blockquotes and scrolling within a populated conversation.`]
];
for (const [label,text] of turns) {
 const user=label.startsWith('You'); const article=document.createElement('div');article.className=user?'message-user':'message-assistant';
 const meta=document.createElement('p');meta.className='message-meta';meta.textContent=label;article.append(meta);
 const body=renderAnswer(text.replace('CODE','```typescript\nasync function continueConversation(conversationId: string, prompt: string, signal: AbortSignal) {\n  await saveDraft({ conversationId, prompt });\n  return provider.reply({ conversationId, prompt, signal, preserveCompletedMessages: true });\n}\n```'));article.append(body);conversation.append(article);
}
const info=document.createElement('p');info.className='message-meta';info.textContent='Visual QA only · authored responses · no model calls or saved chats';conversation.prepend(info);
