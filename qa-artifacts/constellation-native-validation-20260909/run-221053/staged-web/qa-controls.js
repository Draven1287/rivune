
const b=globalThis.__RIVUNE_DESKTOP_HOST__;
const panel=document.createElement('details');panel.open=true;panel.style='position:fixed;z-index:9999;right:8px;top:8px;background:#152238;color:white;border:2px solid gold;padding:8px;font:12px system-ui';panel.innerHTML='<summary>ISOLATED TEAM QA — synthetic routes only</summary><div></div><textarea aria-label="QA evidence" readonly style="width:440px;height:100px"></textarea>';document.body.append(panel);
function button(label,fn){const el=document.createElement('button');el.textContent=label;el.onclick=async()=>{try{panel.querySelector('textarea').value=JSON.stringify(await fn());}catch(e){panel.querySelector('textarea').value=String(e);}};panel.querySelector('div').append(el);}
button('QA configure two routes',async()=>{for(const id of ['qa:team-first','qa:team-second'])await b.configureProvider({id,kind:'codex',executablePath:"/private/tmp/rivune-team-fixed-qa-wydd7kmb/codex",model:null,timeoutMs:600000},true);return b.getModelCatalog();});
button('QA inspect saved state',async()=>({snapshot:await b.getSnapshot(),recovery:await b.getSubmissionRecovery()}));
