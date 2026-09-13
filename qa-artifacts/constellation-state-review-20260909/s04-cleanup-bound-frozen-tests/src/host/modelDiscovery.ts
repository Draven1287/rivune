/** Isolated advertised metadata only: never feeds admission or enables selection. */
export interface ModelDiscoveryRequest { requestID: string; providerID: string }
export interface AdvertisedModel { id: string; model: string; label: string; reasoningEfforts: string[]; defaultReasoningEffort: string; isDefault: boolean }
export interface ModelDiscoveryReport extends ModelDiscoveryRequest {
  schemaVersion: 1; source: 'codexAppServerModelList'; scope: 'isolatedUnauthenticated';
  state: 'available' | 'unauthenticated' | 'unsupported' | 'cancelled' | 'timeout' | 'error';
  authentication: 'unknown' | 'notAuthenticated'; selectionEnabled: false;
  models: AdvertisedModel[]; errorCode: string | null;
}
function invalid(): never { throw new TypeError('Invalid model discovery metadata.'); }
function record(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  if (Reflect.ownKeys(value).length !== keys.length || keys.some(k => !Object.getOwnPropertyDescriptor(value,k)?.hasOwnProperty('value'))) invalid();
}
function text(value: unknown, max=128): asserts value is string { if(typeof value!=='string'||!value||value.trim()!==value||new TextEncoder().encode(value).length>max||/[\u0000-\u001f\u007f]/.test(value))invalid(); }
function request(value: ModelDiscoveryRequest) { record(value,['requestID','providerID']);text(value.requestID);text(value.providerID); }
export function parseModelDiscovery(value: unknown, expected: ModelDiscoveryRequest): ModelDiscoveryReport {
  request(expected);record(value,['schemaVersion','requestID','providerID','source','scope','state','authentication','selectionEnabled','models','errorCode']);
  if(value.schemaVersion!==1||value.requestID!==expected.requestID||value.providerID!==expected.providerID||value.source!=='codexAppServerModelList'||value.scope!=='isolatedUnauthenticated'||value.selectionEnabled!==false)invalid();
  if(typeof value.state!=='string'||!['available','unauthenticated','unsupported','cancelled','timeout','error'].includes(value.state))invalid();
  if(typeof value.authentication!=='string'||!['unknown','notAuthenticated'].includes(value.authentication))invalid();
  if(!Array.isArray(value.models)||value.models.length>128)invalid();const ids=new Set<string>();
  for(const model of value.models){record(model,['id','model','label','reasoningEfforts','defaultReasoningEffort','isDefault']);text(model.id);text(model.model);text(model.label,256);text(model.defaultReasoningEffort);
    if(ids.has(model.id)||typeof model.isDefault!=='boolean')invalid();ids.add(model.id);
    if(!Array.isArray(model.reasoningEfforts)||model.reasoningEfforts.length>16)invalid();for(const effort of model.reasoningEfforts)text(effort);
    if(new Set(model.reasoningEfforts).size!==model.reasoningEfforts.length||!model.reasoningEfforts.includes(model.defaultReasoningEffort))invalid();
  }
  if(value.errorCode!==null)text(value.errorCode);
  const success=['available','unauthenticated'].includes(String(value.state));
  if(success ? value.errorCode!==null||value.authentication!=='notAuthenticated' : value.models.length!==0||value.errorCode===null)invalid();
  return value as unknown as ModelDiscoveryReport;
}
function failure(value:ModelDiscoveryRequest,state:ModelDiscoveryReport['state'],errorCode:string):ModelDiscoveryReport{return {...value,schemaVersion:1,source:'codexAppServerModelList',scope:'isolatedUnauthenticated',state,authentication:'unknown',selectionEnabled:false,models:[],errorCode};}
export function createModelDiscoveryAdapter(bridge: unknown) {
  if(!bridge||typeof bridge!=='object')return null;
  let discover:unknown,cancelMethod:unknown;
  try { discover=Object.getOwnPropertyDescriptor(bridge,'discoverProviderModels')?.value;cancelMethod=Object.getOwnPropertyDescriptor(bridge,'cancelModelDiscovery')?.value; } catch { return null; }
  if(typeof discover!=='function'||typeof cancelMethod!=='function')return null;
  const cancel=async(id:string):Promise<boolean>=>{text(id);const result=await cancelMethod.call(bridge,id);if(typeof result!=='boolean')invalid();return result;};
  return {cancel, async discover(value:ModelDiscoveryRequest,signal?:AbortSignal):Promise<ModelDiscoveryReport>{
    request(value);const bound={...value};if(signal?.aborted)return failure(bound,'cancelled','DISCOVERY_CANCELLED');
    let timer:ReturnType<typeof setTimeout>|undefined;let abort:()=>void=()=>{};
    const requestCancel=()=>{void cancel(bound.requestID).catch(()=>{});};
    const interrupted=new Promise<ModelDiscoveryReport>(resolve=>{abort=requestCancel;signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{requestCancel();resolve(failure(bound,'timeout','DISCOVERY_TERMINATION_UNCONFIRMED'));},10000);});
    try {return await Promise.race([Promise.resolve().then(()=>signal?.aborted?failure(bound,'cancelled','DISCOVERY_CANCELLED'):discover.call(bridge,bound)).then(v=>{
      const report=parseModelDiscovery(v,bound);
      return signal?.aborted && ['available','unauthenticated'].includes(report.state) ? failure(bound,'error','DISCOVERY_CANCELLATION_UNCONFIRMED') : report;
    }).catch(()=>failure(bound,'error','DISCOVERY_PROTOCOL_ERROR')),interrupted]);}
    finally {if(timer)clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }};
}
