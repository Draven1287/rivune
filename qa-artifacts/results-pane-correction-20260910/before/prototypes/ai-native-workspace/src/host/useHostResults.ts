import {useLayoutEffect,useRef,useState} from 'react';
import type {HostArtifactSummary,HostSnapshot} from './contracts';
import {createInspectionSession,tuple,type InspectionState} from './inspectionSession';
import type {createHostWorkspaceController,HostControllerState} from './workspaceController';
type Controller=ReturnType<typeof createHostWorkspaceController>;
const empty=()=>({open:false,owner:null as string|null,inspection:{phase:'list'} as InspectionState,notice:undefined as string|undefined});
/** One session per connected controller. Reconciliation runs before parent snapshot publication. */
export function useHostResults(snapshot:HostSnapshot|null, disconnected:boolean, bridge:unknown){
 const [view,setView]=useState(empty),current=useRef(view);
 const session=useRef<ReturnType<typeof createInspectionSession>|null>(null);
 const opener=useRef<HTMLElement|null>(null),heading=useRef<HTMLHeadingElement>(null),transcript=useRef<HTMLElement>(null);
 const attachedBridge=useRef<unknown>(null);
 const scroll=useRef(0),focusGeneration=useRef(0),connected=useRef(false);
 const publish=(next:typeof view)=>{current.current=next;setView(next);};
 function clear(close=false,notice?:string){session.current?.clear();publish({...current.current,inspection:{phase:'list'},open:close?false:current.current.open,notice});}
 function close(restore=true){
  clear(true);const ticket=++focusGeneration.current;
  if(restore)requestAnimationFrame(()=>{
   if(ticket!==focusGeneration.current||current.current.open||!connected.current)return;
   if(transcript.current)transcript.current.scrollTop=scroll.current;
   const target=opener.current;
   if(target?.isConnected&&target.getClientRects().length&&!target.closest('[inert]'))target.focus();else heading.current?.focus();
  });
 }
 function reconcile(next:HostControllerState){
  if(!current.current.open)return;
  if(!next.snapshot||next.phase==='disconnected'||next.snapshot.activeConversationID!==current.current.owner){close(false);return;}
  const selected=current.current.inspection;
  if(selected.phase!=='list'&&!next.snapshot.artifacts.some(a=>tuple(a)===tuple(selected.selected)))clear(false,'That saved result is no longer in this conversation. Choose another result.');
 }
 // A render gate also protects against a parent update that bypasses subscription reconciliation.
 const owner=snapshot?.activeConversationID??null;
 const visible=view.open&&connected.current&&attachedBridge.current===bridge&&!disconnected&&owner===view.owner;
 const records=snapshot?.artifacts.filter(a=>a.conversationID===owner)??[];
 const captured=view.inspection.phase==='list'?null:view.inspection.selected;
 const validSelection=!captured||records.some(a=>tuple(a)===tuple(captured));
 const inspection=validSelection?view.inspection:{phase:'list'} as InspectionState;
 useLayoutEffect(()=>{if(view.open&&!visible)close(false);else if(!validSelection)clear(false,'That saved result is no longer in this conversation. Choose another result.');},[visible,view.open,validSelection]);
 return {visible,records,inspection,notice:view.notice,heading,transcript,
  attach(controller:Controller){connected.current=true;attachedBridge.current=bridge;session.current=createInspectionSession(q=>controller.inspectArtifact(q),state=>publish({...current.current,inspection:state}));publish(empty());},
  detach(){connected.current=false;++focusGeneration.current;session.current?.dispose();session.current=null;current.current=empty();},
  reconcile,
  open(target:HTMLElement){if(!session.current||!owner)return;++focusGeneration.current;opener.current=target;scroll.current=transcript.current?.scrollTop??0;session.current.clear();publish({...empty(),open:true,owner});},
  select(record:HostArtifactSummary){if(!visible||!records.some(a=>tuple(a)===tuple(record)))return;publish({...current.current,notice:undefined});void session.current?.open(record);},
  retry(){void session.current?.retry();},back(){clear();},close,
 };
}
