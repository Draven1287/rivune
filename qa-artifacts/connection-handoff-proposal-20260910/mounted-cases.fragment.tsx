// Append before scenario selection in the existing hostRenderer.test.tsx harness.
// Register only connection-handoff in rendererScenarios.ts; retain submit prohibition.
// Proposed tests; NOT EXECUTED. Existing fixture/helper types are intentional dependencies.
for(const outcome of ['durable','uncertain','refresh-failure'] as const)
teamFormTests.push(['connection-handoff',`Connection handoff: ${outcome}`,async f=>{
 let saves=0,failRefresh=false;const read=f.bridge.getSnapshot.bind(f.bridge);
 Object.assign(f.bridge,{
  async discoverProviders(){return [{id:'codex:discovered:synthetic',kind:'codex',executablePath:'/synthetic/codex',installed:true}];},
  async getSnapshot(){if(failRefresh)throw Error('Synthetic display unavailable');return read();},
  async configureSelectedProvider(provider:typeof f.snapshot.providers[number]){
   saves++;f.snapshot.providers.push(provider);f.snapshot.selectedProviderID=provider.id;
   if(outcome==='uncertain')throw Error('Synthetic unconfirmed save');
   failRefresh=outcome==='refresh-failure';
   return {schemaVersion:1,state:'durable',provider,selectedProviderID:provider.id};
  },
 });
 await mount(f);await type('Keep my first prompt 🪐');const input=messageInput();
 if(innerWidth<=700)await click('Conversations');await click('Settings');
 assert(!container.textContent?.includes('Continue to chat'),'Continue offered before saved authority');
 await click('Find installed providers');
 const select=container.querySelector<HTMLSelectElement>('#provider-route')!;
 await act(async()=>{select.value='codex:discovered:synthetic';select.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
 await click('Save as workspace default');
 if(outcome==='uncertain'){
  assert(!container.textContent?.includes('Continue to chat'),'Unconfirmed save permits handoff');
  await click('Check saved configuration');
  assert(!container.textContent?.includes('Continue to chat'),'Matching snapshot promoted durability');
 }else{
  if(outcome==='refresh-failure'){
   assert(button('Continue to chat').disabled,'Failed refresh allows handoff');
   failRefresh=false;await click('Refresh workspace display');
  }
  assert(container.querySelector('dialog')?.open,'Save automatically closed Settings');
  await click('Continue to chat');
  await waitFor(()=>document.activeElement===input,'Continue did not focus exact Message');
  assert(!container.querySelector('dialog')?.open,'Continue did not close Settings');
  assert(!input.closest('[inert]')&&getComputedStyle(input).visibility!=='hidden','Focused composer hidden');
  assert(container.textContent?.includes('This save did not test sign-in or a provider response.'),'Readiness overclaimed');
 }
 assert(messageInput()===input&&input.value==='Keep my first prompt 🪐','Draft or textarea identity lost');
 assert(saves===1,'Handoff replayed configuration');
 assert(!f.calls.some(c=>c.name==='submit'),'Handoff submitted a provider request');
}]);
