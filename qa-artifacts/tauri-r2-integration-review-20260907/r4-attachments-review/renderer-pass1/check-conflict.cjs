const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const sourcePath = path.join(root, 'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/app.mjs');
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('async function writeRich(');
const end = source.indexOf('\nfunction saveDraft(', start);
assert(start >= 0 && end > start);
const rich = {revision:1, attachmentIDs:['att-A'], pending:null, conflictRevision:2};
let commits = 0;
const context = vm.createContext({richState:()=>rich, commitRich:async()=>{commits++; throw Error('unexpected commit');}, crypto});
vm.runInContext(source.slice(start,end)+'\nglobalThis.testWriteRich=writeRich;', context);
(async()=>{
  const errors=[];
  for(let i=0;i<2;i++) {
    try { await context.testWriteRich('A','retained text',['att-A'],'quit-token',4); assert.fail('should reject'); }
    catch(e) {errors.push(e.message);}
  }
  assert(errors.every(e=>e.includes('Retry draft save')));
  assert.equal(commits,0); assert.equal(rich.conflictRevision,2);
  assert(source.includes('shutdownFrozen = true;'));
  assert(source.includes('document.querySelector(".shell").inert = true;'));
  assert(source.includes('if (!id || shutdownFrozen || draftWrites.has(id)) return;'));
  const receipt={scope:'Exact extracted writeRich function with stubbed dependencies; no browser/host execution',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),errors,commits,conflictRevisionAfterRetries:rich.conflictRevision};
  fs.writeFileSync(path.join(__dirname,'RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt));
})();
