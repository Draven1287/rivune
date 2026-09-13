import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/chrome.mjs','utf8').replace(/^import .*;\n/gm,'');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`)}
function fixture(){
 const nodes=new Map(),doc=new EventTarget(),win=new EventTarget(),requests=[],storage=new Map();
 class Element extends EventTarget {
  constructor(id=''){super();this.id=id;this.value='';this.dataset={};this.style={};this.attributes={};this.checked=true;this.disabled=false;this.hidden=false;this.isConnected=true;this.open=false;this.clientWidth=440;this.textContent='';this.scrollTop=0;this.tabIndex=0;}
  setAttribute(k,v){this.attributes[k]=v} getAttribute(k){return this.attributes[k]} focus(){doc.activeElement=this}
  getClientRects(){return this.hidden?[]:[{}]} close(){this.open=false;this.dispatchEvent(new Event('close'))} showModal(){this.open=true}
  querySelector(selector){return node(selector)} querySelectorAll(selector){return selector==='.orbit-member'?members:[]}
 }
 function node(selector){if(!nodes.has(selector))nodes.set(selector,new Element(selector.replace(/^#/,'')));return nodes.get(selector)}
 const tabs=['general','connections','models','permissions','appearance','voice','about'].map(k=>{let n=node('#settings-tab-'+k);n.dataset.settingsTab=k;n.setAttribute('aria-controls','settings-panel-'+k);return n});
 const providers=['codex','claude'].map(k=>{let n=node('#provider-'+k+'-choice');n.dataset.provider=k;return n});
 const themes=['galaxy','orbit','plain'].map(k=>{let n=node('#theme-'+k);n.dataset.theme=k;return n});
 const members=[new Element(),new Element(),new Element()];
 doc.querySelector=selector=>selector==='dialog[open]'?[node('#settings-dialog'),node('#onboarding-dialog')].find(n=>n.open)??null:node(selector);
 doc.querySelectorAll=selector=>selector==='[data-settings-tab]'?tabs:selector==='[data-provider]'?providers:selector==='[data-theme]'?themes:[];
 doc.getElementById=id=>node('#'+id);doc.body=node('body');doc.hidden=false;doc.activeElement=doc.body;
 node('#provider-kind').value='codex';node('#background-motion').checked=true;
 const media=new EventTarget();media.matches=false;
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const context=vm.createContext({document:doc,matchMedia:()=>media,window:win,localStorage,
  addEventListener:win.addEventListener.bind(win),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},
  MutationObserver:class{observe(){}},createHostAdapter:h=>h,parseSnapshot:s=>s,initializeOnboarding:()=>{},
  createProviderDiscovery:()=>({available:false}),bindProviderDiscovery:()=>async()=>{},
  __RIVUNE_DESKTOP_HOST__:{configureProvider:async()=>{},getSnapshot:()=>new Promise(resolve=>requests.push(resolve))},console});
 vm.runInContext(source,context);
 const click=n=>n.dispatchEvent(new Event('click'));
 const input=(selector,value)=>{node(selector).value=value;node(selector).dispatchEvent(new Event('input'))};
 const snapshot={schemaVersion:1,selectedProviderID:'claude:local',conversations:[],runs:[],providers:[{id:'codex:local',kind:'codex',executablePath:'/installed/codex',model:'saved-codex'},{id:'claude:local',kind:'claude',executablePath:'/installed/claude',model:'saved-claude'}]};
 return{node,click,input,providers,themes,requests,snapshot,win,localStorage,media,doc,chooseDetected:provider=>context.chooseDetectedProvider(provider)};
}
const f=fixture();
f.click(f.node('#open-settings'));assert.equal(f.requests.length,1);
f.click(f.providers[1]);f.requests.shift()(f.snapshot);await tick();
check('slow snapshot hydrates untouched Claude after early provider switch',()=>{assert.equal(f.node('#provider-kind').value,'claude');assert.equal(f.node('#provider-path').value,'/installed/claude');assert.equal(f.node('#provider-model').value,'saved-claude');assert.match(f.node('#connection-editor-status').textContent,/Saved connection/)});
f.input('#provider-path','/draft/claude');f.input('#provider-model','new-claude');
f.click(f.node('#edit-provider-options'));f.requests.shift()(f.snapshot);await tick();
check('late snapshot preserves actual dirty provider fields',()=>{assert.equal(f.node('#provider-path').value,'/draft/claude');assert.equal(f.node('#provider-model').value,'new-claude')});
f.click(f.providers[0]);check('another provider still hydrates its saved configuration',()=>assert.equal(f.node('#provider-path').value,'/installed/codex'));
f.click(f.providers[1]);check('switching back restores unsaved Claude configuration',()=>assert.equal(f.node('#provider-path').value,'/draft/claude'));
const configured={id:'claude:local',kind:'claude',executablePath:'/draft/claude',model:'new-claude',timeoutMs:120000};
f.win.dispatchEvent(new CustomEvent('rivune:provider-configured',{detail:configured}));
check('window success event reaches the real chrome listener',()=>assert.equal(f.requests.length,1));
const refreshed={...f.snapshot,providers:[f.snapshot.providers[0],{...configured,model:'verified-saved-model'}]};
f.requests.shift()(refreshed);await tick();
check('matching successful save clears dirty state for subsequent saved hydration',()=>assert.equal(f.node('#provider-model').value,'verified-saved-model'));
f.input('#provider-model','newer-unsaved-edit');
f.win.dispatchEvent(new CustomEvent('rivune:provider-configured',{detail:configured}));f.requests.shift()(f.snapshot);await tick();
check('late success does not erase newer edits',()=>assert.equal(f.node('#provider-model').value,'newer-unsaved-edit'));
f.localStorage.setItem=()=>{throw new Error('Storage unavailable')};f.click(f.themes[1]);
check('theme persistence failure reports window-only instead of saved',()=>{assert.equal(f.doc.body.dataset.background,'orbit');assert.match(f.node('#appearance-description').textContent,/could not be saved/)});
f.media.matches=true;f.media.dispatchEvent(new Event('change'));
check('system reduced motion stops backgrounds and disables motion control',()=>{assert.equal(f.doc.body.dataset.motion,'off');assert.equal(f.node('#background-motion').disabled,true)});
f.media.matches=false;f.media.dispatchEvent(new Event('change'));f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));
check('hidden document stops background motion',()=>assert.equal(f.doc.body.dataset.motion,'off'));
const early=fixture();early.click(early.node('#open-settings'));
early.chooseDetected({kind:'claude',displayName:'Claude',executablePath:'/detected/claude'});
check('detected selection cannot save before existing options hydrate',()=>assert.equal(early.node('#connect-provider').disabled,true));
early.requests.shift()(early.snapshot);await tick();
check('delayed hydration retains saved model while keeping detected path',()=>{assert.equal(early.node('#provider-path').value,'/detected/claude');assert.equal(early.node('#provider-model').value,'saved-claude');assert.equal(early.node('#connect-provider').disabled,false)});
console.log(`${checks} controller checks passed; Node DOM doubles, canonical chrome.mjs, no provider or browser process.`);
