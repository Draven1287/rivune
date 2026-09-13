// Test/demo entry only. Never integrate this file or its fixtures into the app.
import {createTranscript,projectConversation} from './transcript.mjs';
import {renderMarkdown,safeExternalURL} from './markdown.mjs';
const {snapshot}=await (await fetch('./rust-wire.json')).json();
window.review={snapshot,createTranscript,projectConversation,renderMarkdown,safeExternalURL,copied:[],opened:[],announcements:[]};
const report=message=>{window.review.announcements.push(message);document.querySelector('#run-status').textContent=message};
window.review.transcript=createTranscript({container:document.querySelector('#transcript'),scroller:document.querySelector('.response-scroll'),copyText:async text=>{window.review.copied.push(text)},openExternal:async url=>{window.review.opened.push(url)},onStatus:report});
document.querySelector('#welcome').hidden=true;
document.querySelector('#connection-status').textContent='Synthetic fixture · no AI provider called';
document.querySelector('#submit').disabled=true;
window.review.transcript.render(snapshot,'welcome');
