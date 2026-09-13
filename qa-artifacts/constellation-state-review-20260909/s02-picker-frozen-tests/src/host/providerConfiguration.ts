import { parseHostSnapshot, type HostProviderConfig, type HostSnapshot } from './contracts.ts';
export interface SelectedHostRoute { id: string; kind: 'codex'|'claude'; executablePath: string; installed: true }
export interface ConfigurationGuard { schemaVersion: 1; expectedProvider: HostProviderConfig|null; expectedSelectedProviderID: string|null }
export type ConfigurationResult = {state:'durable';provider:HostProviderConfig;selectedProviderID:string|null}|{state:'uncertain';code:'CONFIGURATION_OUTCOME_UNCONFIRMED'};
function data(v:unknown,keys:string[]):asserts v is Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Reflect.ownKeys(v).length!==keys.length||keys.some(k=>!Object.getOwnPropertyDescriptor(v,k)?.hasOwnProperty('value')))throw Error('Invalid configuration data');}
function text(v:unknown,max:number):asserts v is string{if(typeof v!=='string'||!v||v.trim()!==v||new TextEncoder().encode(v).length>max||/[\u0000-\u001f\u007f]/.test(v))throw Error('Invalid configuration data');}
export function prepareProviderConfiguration(route:SelectedHostRoute,snapshot:HostSnapshot,select:boolean){
 data(route,['id','kind','executablePath','installed']);text(route.id,128);text(route.executablePath,4096);
 if(!['codex','claude'].includes(route.kind)||route.installed!==true||typeof select!=='boolean'||!route.id.startsWith(`${route.kind}:discovered:`))throw Error('Unsupported host route');
 const before=parseHostSnapshot(snapshot);
 const existing=before.providers.find(p=>p.id===route.id)??null;
 if(existing&&(existing.kind!==route.kind||existing.executablePath!==route.executablePath||existing.model!==null))throw Error('Existing route requires separate review');
 const provider:HostProviderConfig={id:route.id,kind:route.kind,executablePath:route.executablePath,model:null,timeoutMs:existing?.timeoutMs??60000};
 return {provider,select,guard:{schemaVersion:1,expectedProvider:existing?{...existing}:null,expectedSelectedProviderID:before.selectedProviderID} satisfies ConfigurationGuard};
}
export function createProviderConfigurationAdapter(bridge:unknown){
 if(!bridge||typeof bridge!=='object')return null;
 const configure=Object.getOwnPropertyDescriptor(bridge,'configureSelectedProvider')?.value;
 if(typeof configure!=='function')return null;
 let pending=false;
 return {async configure(route:SelectedHostRoute,snapshot:HostSnapshot,select:boolean):Promise<ConfigurationResult>{
  if(pending)throw Error('Configuration already pending');const request=prepareProviderConfiguration(route,snapshot,select);
  const expectedProvider={...request.provider};const expectedSelectedID=select?expectedProvider.id:request.guard.expectedSelectedProviderID;pending=true;
  try{
   const result=await configure.call(bridge,{...request.provider},request.select,{...request.guard,expectedProvider:request.guard.expectedProvider?{...request.guard.expectedProvider}:null});
   data(result,['schemaVersion','state','provider','selectedProviderID']);
   if(result.schemaVersion!==1||result.state!=='durable')throw Error('Invalid acknowledgement');
   data(result.provider,['id','kind','executablePath','model','timeoutMs']);
   const acknowledged=result.provider;
   if(Object.keys(expectedProvider).some(k=>acknowledged[k]!==expectedProvider[k as keyof HostProviderConfig])||result.selectedProviderID!==expectedSelectedID)throw Error('Mismatched acknowledgement');
   return {state:'durable',provider:{...expectedProvider},selectedProviderID:expectedSelectedID};
  }catch{return {state:'uncertain',code:'CONFIGURATION_OUTCOME_UNCONFIRMED'};}finally{pending=false;}
 }};
}
