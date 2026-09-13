import {readFileSync} from 'node:fs';
import {parseSnapshot,parseAcknowledgement} from './core.mjs';
const value=JSON.parse(readFileSync(new URL('./RUST_WIRE.json',import.meta.url),'utf8'));
let snapshotAccepted=true,snapshotError=null;
try{parseSnapshot(value.snapshot)}catch(error){snapshotAccepted=false;snapshotError=error.message}
console.log(JSON.stringify({snapshotAccepted,snapshotError,acknowledgement:parseAcknowledgement(value.ack,'r1'),selectedProviderVisible:value.snapshot.selectedProviderID??null,submitAccepted:value.submitAccepted,submitError:value.submitError,retryAccepted:value.retryAccepted,retryError:value.retryError},null,2));
