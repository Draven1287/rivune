import { prepareProviderConfiguration, type SelectedHostRoute, type ConfigurationResult } from './providerConfiguration.ts';
import type { HostSnapshot } from './contracts.ts';
type Intent=ReturnType<typeof prepareProviderConfiguration>;
export interface ConfigurationOperation {schemaVersion:1;operationID:string;intent:Intent;state:'reserved'|'applied'|'rejected';acknowledged:boolean}
const names=['reserveProviderConfiguration','getProviderConfigurationOperation','applyProviderConfiguration','reconcileProviderConfiguration','acknowledgeProviderConfiguration'] as const;
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function exact(a:unknown,b:unknown):boolean {if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;const x=Object.keys(a),y=Object.keys(b);return x.length===y.length&&x.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&exact((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k]));}
function object(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Reflect.ownKeys(v).length!==keys.length||keys.some(k=>!Object.getOwnPropertyDescriptor(v,k)?.hasOwnProperty('value')))throw Error('Invalid operation');return v as Record<string,unknown>;}
function provider(v:unknown){const p=object(v,['id','kind','executablePath','model','timeoutMs']);if(typeof p.id!=='string'||!p.id||p.id.length>128||!['codex','claude'].includes(String(p.kind))||typeof p.executablePath!=='string'||!p.executablePath||p.executablePath.length>4096||p.model!==null||typeof p.timeoutMs!=='number'||!Number.isInteger(p.timeoutMs)||p.timeoutMs<1000||p.timeoutMs>600000)throw Error('Invalid provider');}
function parse(v:unknown):ConfigurationOperation {const o=object(v,['schemaVersion','operationID','intent','state','acknowledged']);if(o.schemaVersion!==1||typeof o.operationID!=='string'||!/^configuration:[1-9][0-9]{0,19}$/.test(o.operationID)||!['reserved','applied','rejected'].includes(String(o.state))||typeof o.acknowledged!=='boolean'||(o.acknowledged&&o.state==='reserved'))throw Error('Invalid operation');const i=object(o.intent,['provider','select','guard']);provider(i.provider);if(typeof i.select!=='boolean')throw Error('Invalid intent');const g=object(i.guard,['schemaVersion','expectedProvider','expectedSelectedProviderID']);if(g.schemaVersion!==1||(g.expectedSelectedProviderID!==null&&(typeof g.expectedSelectedProviderID!=='string'||!g.expectedSelectedProviderID||g.expectedSelectedProviderID.length>128)))throw Error('Invalid guard');if(g.expectedProvider!==null)provider(g.expectedProvider);return copy(o) as unknown as ConfigurationOperation;}
const uncertain=():ConfigurationResult=>({state:'uncertain',code:'CONFIGURATION_OUTCOME_UNCONFIRMED'});
/** Host snapshot owns identity and durability. No browser persistence or automatic replay. */
export function createConfigurationRecoveryAdapter(bridge:unknown){
 if(!bridge||typeof bridge!=='object')return null;
 const methods=Object.fromEntries(names.map(n=>[n,Object.getOwnPropertyDescriptor(bridge,n)?.value]));if(names.some(n=>typeof methods[n]!=='function'))return null;
 let busy=false;
 async function call(n:typeof names[number],...args:unknown[]){return methods[n].apply(bridge,args);}
 function bound(v:unknown,expected:ConfigurationOperation,state:string,acknowledged:boolean){const o=parse(v);if(o.operationID!==expected.operationID||!exact(o.intent,expected.intent)||o.state!==state||o.acknowledged!==acknowledged)throw Error('Mismatched operation');return o;}
 async function acknowledge(o:ConfigurationOperation){bound(await call('acknowledgeProviderConfiguration',o.operationID),o,o.state,true);}
 return {
  async read(){const v=await call('getProviderConfigurationOperation');if(v===null)return null;const o=parse(v);if(o.acknowledged)throw Error('Invalid outstanding operation');return o;},
  async configure(route:SelectedHostRoute,snapshot:HostSnapshot,select:boolean):Promise<ConfigurationResult>{
   if(busy)throw Error('Configuration pending');const intent=prepareProviderConfiguration(route,snapshot,select);busy=true;
   try{const reserved=parse(await call('reserveProviderConfiguration',copy(intent)));if(!exact(reserved.intent,intent)||reserved.state!=='reserved'||reserved.acknowledged)throw Error('Mismatched reservation');
    const applied=bound(await call('applyProviderConfiguration',copy(intent),reserved.operationID),reserved,'applied',false);await acknowledge(applied);
    return {state:'durable',provider:copy(intent.provider),selectedProviderID:select?intent.provider.id:intent.guard.expectedSelectedProviderID};
   }catch{return uncertain();}finally{busy=false;}
  },
  async reconcile():Promise<'applied'|'rejected'|'none'|'uncertain'>{
   if(busy)return 'uncertain';busy=true;
   try{const value=await call('getProviderConfigurationOperation');if(value===null)return 'none';const o=parse(value);if(o.acknowledged)throw Error('Invalid operation');const expected=o.state==='reserved'?'rejected':o.state;const confirmed=bound(await call('reconcileProviderConfiguration',o.operationID),o,expected,false);await acknowledge(confirmed);return confirmed.state as 'applied'|'rejected';}catch{return 'uncertain';}finally{busy=false;}
  }
 };
}
