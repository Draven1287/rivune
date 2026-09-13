import type { HostArtifactRequest, HostArtifactInspection, HostArtifactSummary } from './contracts';

export type InspectionState =
 | { phase: 'list' }
 | { phase: 'loading' | 'error'; selected: HostArtifactSummary }
 | { phase: 'ready'; selected: HostArtifactSummary; result: HostArtifactInspection };
export const tuple = (a: HostArtifactSummary) => JSON.stringify([a.conversationID,a.requestID,a.artifactID,a.contentSHA256]);
/** inspect MUST perform the production parser's schema/identity/UTF-8/hash validation.
 * No host invocation is implemented here. The owner supplies the accepted adapter. */
export function createInspectionSession(
 inspect: (request: HostArtifactRequest) => Promise<HostArtifactInspection>,
 publish: (state: InspectionState) => void,
) {
 let generation=0, state:InspectionState={phase:'list'};
 const emit=(next:InspectionState)=>{state=next;publish(next);};
 async function open(selected:HostArtifactSummary) {
  const ticket=++generation;
  // Capture immutable metadata rather than retaining caller-owned mutable objects.
  const captured={...selected,origin:{...selected.origin}};
  emit({phase:'loading',selected:captured});
  try {
   const result=await inspect({artifactID:captured.artifactID,conversationID:captured.conversationID,requestID:captured.requestID,expectedSHA256:captured.contentSHA256});
   if(ticket!==generation)return;
   // Defense in depth; full parser validation remains the injected adapter's duty.
   if(result.artifactID!==captured.artifactID || result.conversationID!==captured.conversationID || result.requestID!==captured.requestID || result.contentSHA256!==captured.contentSHA256)throw Error('Identity mismatch');
   emit({phase:'ready',selected:captured,result});
  }catch{if(ticket===generation)emit({phase:'error',selected:captured});}
 }
 return {
  open,
  retry(){if(state.phase==='error')return open(state.selected);return Promise.resolve();},
  clear(){++generation;emit({phase:'list'});},
  dispose(){++generation;},
 };
}
