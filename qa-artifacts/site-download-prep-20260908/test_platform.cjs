// Unit-test the actual platform handler with a minimal DOM; no browser/network.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const original=fs.readFileSync(__dirname+'/original-menu.js','utf8');
const patched=fs.readFileSync(__dirname+'/patched-menu.js','utf8');
function run(script,ready){
 const title={textContent:ready?'Mac download available':'macOS download not yet available'};
 const summary=ready?'Rivune 0.2.0-beta.1 is available as a validated DMG for macOS 26.0+ on Apple silicon & Intel.':'The desktop app is in development. The macOS download is not yet available.';
 const body={textContent:summary},label={textContent:'macOS'};
 const panel={dataset:{releaseReady:String(ready)},focus(){this.focused=true}};
 const macOnly=ready?[{hidden:false},{hidden:false}]:[];
 const buttons=['mac','windows','linux'].map(p=>({dataset:{platform:p},pressed:p==='mac',addEventListener(event,f){this.click=f},setAttribute(k,v){this.pressed=v==='true'}}));
 const document={addEventListener(){},querySelector(s){return ({'[data-platform-panel]':panel,'[data-platform-title]':title,'[data-platform-body]':body,'[data-platform-label]':label})[s]||null},querySelectorAll(s){return s==='[data-platform]'?buttons:s==='[data-mac-only]'?macOnly:[]}};
 vm.runInNewContext(script,{document});
 assert(buttons[0].pressed);
 for(const name of ['windows','linux']){
  buttons.find(b=>b.dataset.platform===name).click();
  assert.equal(label.textContent,name==='windows'?'Windows':'Linux');
  assert(title.textContent.includes('not yet available'));
  assert(macOnly.every(e=>e.hidden));
  assert.equal(buttons.filter(b=>b.pressed).length,1);
  buttons[0].click();assert(macOnly.every(e=>!e.hidden));assert(panel.focused);
 }
 return {body:body.textContent,expected:summary};
}
const before=run(original,true);assert.notEqual(before.body,before.expected,'reproduce original metadata loss');
for(const ready of [true,false]){const after=run(patched,ready);assert.equal(after.body,after.expected)}
console.log('PASS: original ready summary loss reproduced; patched ready/unavailable Mac-Windows-Linux-Mac transitions, controls, visibility and focus');
