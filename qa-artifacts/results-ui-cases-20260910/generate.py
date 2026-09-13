from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent
source=Path('prototypes/ai-native-workspace/src/host/contracts.ts')
def write(name,value): (root/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
records={}
for key,conv,run,content in [('A','conversation-a','run-a','Saved A\n  exact whitespace\nλ 🌌\n<script>alert(1)</script>\n'),('B','conversation-a','run-b','Saved B\n[link](https://example.invalid)\n'),('C','conversation-b','run-c','Saved A\n  exact whitespace\nλ 🌌\n<script>alert(1)</script>\n')]:
 b=content.encode(); digest=hashlib.sha256(b).hexdigest(); aid='artifact-'+key.lower()
 q=dict(artifactID=aid,conversationID=conv,requestID=run,expectedSHA256=digest)
 s=dict(schemaVersion=1,artifactID=aid,conversationID=conv,requestID=run,origin=dict(kind='finalAnswer',memberID=None,providerID='provider-a'),displayName='Final answer',previewKind='plainText',languageHint=None,byteLength=len(b),contentSHA256=digest,availability='available',createdAt='2026-09-10T18:00:00Z',supersedesArtifactID=None)
 r={k:v for k,v in s.items() if k not in ['origin','displayName','createdAt','supersedesArtifactID']};r['text']=content
 records[key]=dict(HostArtifactRequest=q,HostArtifactSummary=s,HostArtifactInspection=r)
write('dto-fixtures.json',records)
write('provisional-unavailable.json',[dict(state=state,currentParserOutcome='reject as incompatible; no content',futureSummary={**records['A']['HostArtifactSummary'],'availability':state},futureInspectionStatus='Response text omission/nullability not specified by proposed contract; do not fabricate a valid response DTO',expectedFutureMessage=message) for state,message in [('missing','This saved result is missing. Its record is still available.'),('corrupt','This result did not match its saved integrity record. Content is unavailable.'),('unreadable','Rivune could not read this saved result.')]])
cases=[]
def case(id,steps,expected): cases.append(dict(id=id,steps=steps,expected=expected))
case('late-a-after-b',['open Results','select A -> deferred read a1','Back','select B -> deferred read b1','resolve b1 with B','resolve a1 with A'],dict(content='B only',selected='B',focus='inspector-heading:B',inspectCalls=['A','B'],staleEffects=0))
case('same-tuple-retry-race',['select A -> deferred read a1','Close','open Results','select A -> deferred read a2','resolve a2 with A','reject a1 with transport error'],dict(content='A',error=None,focus='inspector-heading:A',inspectCalls=['A','A'],note='Tuple equality alone is insufficient; read generation must match.'))
case('retry-duplicate',['select A -> read a1','reject a1 with transport error','activate Retry inspection -> read a2','activate Retry inspection again before settlement','resolve a2 with A'],dict(inspectCalls=['A','A'],content='A',focus='inspector-heading:A',note='Move focus synchronously to inspector heading before disabling pending Retry; async arrival never moves focus.'))
case('failed-navigation',['inspect A','set local draft to unsaved text','request conversation-b','reject existing draft save/open navigation'],dict(activeConversation='conversation-a',selected='A',content='A',draft='unsaved text',focus='conversation-button:conversation-b',extraPaneSaveCalls=0,extraInspectCalls=0))
case('successful-navigation',['select A -> deferred read a1','navigate conversation-b successfully','resolve a1 with A','navigate conversation-a successfully'],dict(pane='closed',selected=None,content=None,focus='Message',extraInspectCalls=0))
case('back-close-focus',['open Results using header button','select A','Back','select A','Escape within Results'],dict(focusSequence=['results-heading','inspector-heading:A','result-row:A','inspector-heading:A','results-button'],pane='closed'))
case('removed-opener',['inspect A','refresh removes summary A','Close'],dict(content=None,selected=None,focusSequence=['results-heading','results-button'],note='If header Results button no longer exists, use current chat heading.'))
case('close-pending',['select A -> deferred read a1','Close','resolve a1 with A'],dict(pane='closed',content=None,focus='results-button',staleEffects=0))
case('identity-mismatch',['select A','resolve read with C (same text/hash, foreign identity)'],dict(content=None,copyControl=False,error='This result could not be verified for the selected record. Refresh saved status and try again.',focus='inspector-heading:A'))
case('transport-unavailable',['select A','reject read with host disconnected'],dict(content=None,copyControl=False,focus='inspector-heading:A',note='Expose connection/refresh failure; do not synthesize a missing/corrupt DTO. Reconnect does not silently inspect.'))
write('interaction-cases.json',cases)
write('source-baseline.json',dict(source=str(source),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),dtoNames=['HostArtifactRequest','HostArtifactSummary','HostArtifactInspection'],validation='Data checks only; production parser and rendered UI not executed'))
print('Generated 3 DTO triplets, 3 provisional states and',len(cases),'interaction cases')
