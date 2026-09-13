// Graphite-only preferences. No provider, account, filesystem or network access.
export const GRAPHITE_STORAGE_KEY = 'rivune.appearance.graphite.v1';
export const GRAPHITE_DEFAULTS = Object.freeze({background:'#080c12', accent:'#c1e1ff'});
const instances = new WeakMap();
const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
function luminance(value) {
  const rgb = [1,3,5].map(i => parseInt(value.slice(i,i+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
export function contrast(a,b) {
  if (!hex(a) || !hex(b)) return 0;
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function validateGraphite(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const background=hex(value.background),accent=hex(value.accent);
  // Existing Graphite surfaces use light text; maintain their dark appearance.
  // The dimmest affected sidebar label must retain normal-text contrast.
  if (!background || !accent || contrast(background,'#8796a6') < 4.5 || luminance(background) > .018) return null;
  if ([background,'#17212c','#080c12'].some(surface=>contrast(accent,surface)<4.5)) return null;
  return {background,accent};
}
export function initializeAppearanceControls({container,storage}={}) {
  if (!container?.ownerDocument || !container.append) throw new TypeError('Appearance container required');
  const doc=container.ownerDocument;
  if (instances.has(doc)) return instances.get(doc);
  const win=doc.defaultView,body=doc.body;
  const sheetURL=new URL('./appearance-controls.css',import.meta.url).href;
  if (![...doc.querySelectorAll('link[rel="stylesheet"]')].some(n=>n.href===sheetURL)) {
    const sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=sheetURL;doc.head.append(sheet);
  }
  let saved={...GRAPHITE_DEFAULTS},statusText='Default Graphite colors.',store=storage;
  try {
    if (store===undefined) store=win.localStorage;
    const raw=store.getItem(GRAPHITE_STORAGE_KEY);
    if (raw!==null) {
      if(typeof raw!=='string'||raw.length>256) throw Error('Invalid preference');
      const value=JSON.parse(raw);
      const valid=value?.schemaVersion===1 && Object.keys(value).sort().join(',')==='accent,background,schemaVersion' && validateGraphite(value);
      if(!valid) throw Error('Invalid preference');
      saved=valid;statusText='Graphite colors saved on this device.';
    }
  } catch {statusText='Saved colors could not be loaded. Default colors are shown; you can try saving again.';}
  const section=doc.createElement('section');section.className='graphite-controls';
  function node(tag,text,parent=section){const n=doc.createElement(tag);if(text)n.textContent=text;parent.append(n);return n}
  node('h4','Graphite colors');
  node('p','Choose a dark background and a light accent. These colors apply only to Graphite.');
  const form=node('form');form.noValidate=true;
  const fields={};
  for(const [key,title,presets] of [
    ['background','Background',[['Graphite','#080c12'],['Midnight','#0b1220'],['Charcoal','#17191d']]],
    ['accent','Accent',[['Ice','#c1e1ff'],['Mint','#afe2cb'],['Lavender','#d4c3f5']]]
  ]) {
    const group=node('fieldset',null,form);node('legend',title,group);
    const choices=node('div',null,group);choices.className='graphite-presets';choices.setAttribute('role','group');choices.setAttribute('aria-label',title+' presets');
    const label=node('label',title+' hex color',group);
    const input=node('input',null,label);input.type='text';input.value=saved[key];input.maxLength=7;input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-describedby','graphite-color-help graphite-color-error');
    fields[key]=input;
    for(const [name,color] of presets){const b=node('button',name,choices);b.type='button';b.dataset.color=color;b.setAttribute('aria-label',name+' '+title.toLowerCase());b.addEventListener('click',()=>{input.value=color;validateForm()})}
    input.addEventListener('input',validateForm);
  }
  const help=node('p','Use six-digit hex colors, such as #080c12. Colors that make text hard to read cannot be applied.',form);help.id='graphite-color-help';
  const error=node('p',null,form);error.id='graphite-color-error';error.setAttribute('role','alert');error.hidden=true;
  const sample=node('div',null,form);sample.className='graphite-color-sample';node('strong','Your workspace',sample);node('span','A little room to think.',sample);
  const actions=node('div',null,form);actions.className='graphite-actions';
  const apply=node('button','Save colors',actions);apply.type='submit';apply.className='secondary';
  const reset=node('button','Reset colors',actions);reset.type='button';reset.className='secondary';
  const status=node('p',statusText);status.setAttribute('role','status');status.className='graphite-save-status';
  const themeNote=node('p');themeNote.className='graphite-theme-note';
  function validateForm(){
    const values={background:fields.background.value,accent:fields.accent.value},valid=validateGraphite(values);
    error.hidden=!!valid;
    error.textContent=valid?'':'Use a dark background and a lighter accent so text remains readable (at least 4.5:1 contrast).';
    for(const [key,input] of Object.entries(fields)){input.setAttribute('aria-invalid',String(!hex(input.value)||!valid));
      input.closest('fieldset').querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===hex(input.value))));}
    if(valid){sample.style.setProperty('--graphite-sample-bg',valid.background);sample.style.setProperty('--graphite-sample-accent',valid.accent)}
    apply.disabled=!valid;
    return valid;
  }
  function applyTheme(){
    const active=body.dataset.background==='plain';
    for(const [key,value] of Object.entries(saved)){
      if(active)body.style.setProperty('--rivune-graphite-'+key,value);
      else body.style.removeProperty('--rivune-graphite-'+key);
    }
    themeNote.textContent=active?'These colors are active in Graphite.':'Switch to Graphite above to use these colors. Galaxy and Orbit keep their own appearance.';
  }
  function persist(values){
    saved=values;applyTheme();
    try {store.setItem(GRAPHITE_STORAGE_KEY,JSON.stringify({schemaVersion:1,...saved}));status.textContent='Graphite colors saved on this device.'}
    catch {status.textContent='Colors could not be saved. They apply only in this window; reopening may restore your previous colors.'}
  }
  form.addEventListener('submit',e=>{e.preventDefault();const value=validateForm();if(value)persist(value);else fields.background.focus()});
  reset.addEventListener('click',()=>{for(const key of Object.keys(fields))fields[key].value=GRAPHITE_DEFAULTS[key];validateForm();persist({...GRAPHITE_DEFAULTS})});
  container.append(section);validateForm();applyTheme();
  const observer=new win.MutationObserver(applyTheme);observer.observe(body,{attributes:true,attributeFilter:['data-background']});
  const api={destroy(){observer.disconnect();section.remove();for(const key of Object.keys(saved))body.style.removeProperty('--rivune-graphite-'+key);instances.delete(doc)}};
  instances.set(doc,api);return api;
}
