from pathlib import Path
import difflib,json,hashlib
root=Path(__file__).resolve().parent
paths=['prototypes/ai-native-workspace/src/host/ProviderSetup.tsx','prototypes/ai-native-workspace/src/host/HostWorkspace.tsx']
base={p:Path(p).read_text() for p in paths};out=dict(base)
p=paths[0];s=out[p]
s=s.replace('onConfirmed}:{bridge:unknown;disabled:boolean;onConfirmed:()=>Promise<void>}','onConfirmed,onContinue}:{bridge:unknown;disabled:boolean;onConfirmed:()=>Promise<void>;onContinue?:()=>void}')
s=s.replace("const [refreshNeeded,setRefreshNeeded]=useState(false);","const [refreshNeeded,setRefreshNeeded]=useState(false);\n const [handoffConfirmed,setHandoffConfirmed]=useState(false);\n useEffect(()=>{setHandoffConfirmed(false);},[bridge]);")
s=s.replace("busy.current=true;setPhase('inspecting');","setHandoffConfirmed(false);busy.current=true;setPhase('inspecting');")
s=s.replace("busy.current=true;setPhase('saving');","setHandoffConfirmed(false);busy.current=true;setPhase('saving');")
s=s.replace("if(result.state==='durable'){setRefreshContext", "if(result.state==='durable'){setHandoffConfirmed(true);setRefreshContext")
s=s.replace('Close Settings and explicitly send a short message when you are ready.','Continue to chat when you are ready; no message is sent automatically.')
s=s.replace("if(result==='uncertain'){setPhase", "if(result==='uncertain'){setPhase")
s=s.replace("setRefreshContext(result==='applied'?", "setHandoffConfirmed(result==='applied');setRefreshNeeded(false);setRefreshContext(result==='applied'?")
s=s.replace("   {phase==='reviewed'", "   {handoffConfirmed&&onContinue&&<button type=\"button\" disabled={blocked||refreshNeeded||durabilityUnconfirmed} onClick={()=>{if(!busy.current&&!currentDisabled.current&&!refreshNeeded&&!durabilityUnconfirmed)onContinue();}}>Continue to chat</button>}\n   {phase==='reviewed'")
out[p]=s
p=paths[1];s=out[p]
s=s.replace("const [settings, setSettings] = useState(false);", "const [settings, setSettings] = useState(false);\n  const [connectionHandoff,setConnectionHandoff]=useState(false);")
s=s.replace("<ProviderSetup bridge={bridge} disabled=", "<ProviderSetup bridge={bridge} onContinue={conversation&&!unavailable?()=>{results.close(false);setContext(false);settingsOpener.current=message.current;setConnectionHandoff(true);setSettings(false);}:undefined} disabled=")
s=s.replace("<label htmlFor=\"host-message\">Message</label>", "{connectionHandoff&&<p role=\"status\">Workspace default: {state.snapshot?.selectedProviderID??'Not recorded'}. This save did not test sign-in or a provider response. The conversation uses the selection shown above.</p>}\n          <label htmlFor=\"host-message\">Message</label>")
out[p]=s
patch='';manifest={}
for p in paths:
 assert out[p]!=base[p]
 dest=root/'files'/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(out[p]);manifest[p]={'baseSHA256':hashlib.sha256(base[p].encode()).hexdigest(),'proposalSHA256':hashlib.sha256(out[p].encode()).hexdigest()};patch+=''.join(difflib.unified_diff(base[p].splitlines(True),out[p].splitlines(True),fromfile='a/'+p,tofile='b/'+p))
(root/'proposal.patch').write_text(patch);(root/'source-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
