// Executes the actual component handlers with deferred, private clipboard writes.
// No browser, OS clipboard, provider, or production storage is used.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/browser/BrowserWorkspace.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
}}).outputText;
function nodes(value, all = []) {
  if (Array.isArray(value)) value.forEach(item => nodes(item, all));
  else if (value && typeof value === 'object') { all.push(value); nodes(value.props?.children, all); }
  return all;
}
function fixture() {
  let slots = [], index = 0, effects = [], dirty = false, tree, unmounted = false, writesAfterUnmount = 0, focused = ''; 
  const requests = [];
  const dialog = { scrollTop: 0, open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const current = {
    activeConversationId: 'one', conversations: [{ id: 'one', title: 'One' }],
    messages: ['a', 'b'].map(id => ({ id, role: 'assistant', content: 'Sample', artifactId: id })),
    artifacts: ['a', 'b'].map(id => ({ id, title: id.toUpperCase(), content: `TEXT ${id.toUpperCase()}` })),
    agents: [{ id: 'lead', name: 'Lead', role: 'lead' }, { id: 'member', name: 'Member', role: 'member' }],
    selectConversation(id) { current.activeConversationId = id; },
    newConversation() { current.activeConversationId = 'new'; },
  };
  const react = {
    useState(initial) {
      const id = index++;
      if (!(id in slots)) slots[id] = typeof initial === 'function' ? initial() : initial;
      return [slots[id], value => {
        if (unmounted) writesAfterUnmount++;
        const next = typeof value === 'function' ? value(slots[id]) : value;
        if (!Object.is(next, slots[id])) { slots[id] = next; dirty = true; }
      }];
    },
    useRef(initial) { const id = index++; return slots[id] ?? (slots[id] = { current: initial }); },
    useSyncExternalStore(_, get) { return get(); },
    useLayoutEffect(effect, deps) {
      const id = index++, old = slots[id];
      if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) {
        effects.push(() => { old?.cleanup?.(); slots[id] = { deps, cleanup: effect() }; });
      }
    },
  };
  const exported = {};
  vm.runInNewContext(compiled, {
    exports: exported,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name.includes('useWorkspaceDemo')) return { useWorkspaceDemo: () => current };
      if (name.includes('draftStore')) return { browserDraftStore: { getDraft: () => '', getNotice: () => null } };
      if (name.includes('button')) return { Button: 'button' };
      return {};
    },
    navigator: { clipboard: { writeText(text) { return new Promise((resolve, reject) => requests.push({ text, resolve, reject })); } } },
    requestAnimationFrame() {},
    window: { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) },
    document: { activeElement: null },
  });
  function render() {
    for (let pass = 0; pass < 5; pass++) {
      dirty = false; index = 0; effects = [];
      tree = exported.BrowserWorkspace();
      nodes(tree).find(n => n.props?.className === 'bw-dialog bw-results').props.ref.current = dialog;
      const resultNodes = nodes(nodes(tree).find(n => n.props?.className === 'bw-dialog bw-results'));
      resultNodes.find(n => n.props?.id === 'bw-results-title').props.ref.current = { focus: () => { focused = 'heading'; } };
      resultNodes.filter(n => n.props?.className === 'bw-result-card').forEach(n => n.props.ref({ focus: () => { focused = JSON.stringify(n.props.children); } }));
      effects.forEach(effect => effect());
      if (!dirty) return tree;
    }
    throw new Error('Unstable hook render');
  }
  function find(predicate) { return nodes(tree).find(predicate); }
  function resultDialog() { return find(n => n.props?.className === 'bw-dialog bw-results'); }
  function clickClass(name) { find(n => n.props?.className === name).props.onClick(); render(); }
  function select(id) {
    const card = nodes(resultDialog()).filter(n => n.props?.className === 'bw-result-card')[id === 'a' ? 0 : 1];
    card.props.onClick(); render();
  }
  function copyButton() { return find(n => n.props?.children === 'Copy sample text'); }
  function status() { return find(n => n.props?.role === 'status')?.props.children ?? ''; }
  function start() { const promise = copyButton().props.onClick(); render(); return promise; }
  function open(id = 'a') { clickClass('bw-results-trigger'); select(id); }
  function back() { clickClass('bw-back'); }
  function close(kind = 'button') {
    if (kind === 'button') find(n => n.props?.['aria-label'] === 'Close results').props.onClick();
    else { resultDialog().props.onCancel(); dialog.close(); }
    resultDialog().props.onClose(); render();
  }
  function unmount() { unmounted = true; slots.forEach(slot => slot?.cleanup?.()); }
  render();
  return { render, current, open, back, select, start, close, status, requests, copyButton, unmount,
    writesAfterUnmount: () => writesAfterUnmount, dialog, focused: () => focused,
    rosterText: () => JSON.stringify(find(n => n.type === 'summary').props.children),
  };
}
(async () => {
  let checks = 0;
  for (const outcome of ['resolve', 'reject']) {
    const f = fixture(); f.open();
    const copy = f.start();
    assert.equal(f.requests.length, 1); assert.equal(f.requests[0].text, 'TEXT A');
    assert.equal(f.copyButton().props.disabled, true);
    await f.copyButton().props.onClick(); assert.equal(f.requests.length, 1, 'duplicate pending write blocked');
    f.requests[0][outcome](new Error('Synthetic denied')); await copy; f.render();
    assert.equal(f.status(), outcome === 'resolve' ? 'Copied sample text' : 'Copy unavailable. Select the text to copy it.');
    assert.equal(f.copyButton().props.disabled, false); checks++;
  }
  for (const transition of ['selection', 'back', 'close-reopen', 'escape-reopen', 'conversation', 'unmount']) {
    for (const outcome of ['resolve', 'reject']) {
      const f = fixture(); f.open(); const copy = f.start();
      if (transition === 'selection') { f.back(); f.select('b'); }
      if (transition === 'back') f.back();
      if (transition === 'close-reopen') { f.close(); f.open(); }
      if (transition === 'escape-reopen') { f.close('escape'); f.open(); }
      if (transition === 'conversation') { f.current.activeConversationId = 'two'; f.render(); }
      if (transition === 'unmount') f.unmount();
      f.requests[0][outcome](new Error('Synthetic denied')); await copy;
      if (transition === 'unmount') assert.equal(f.writesAfterUnmount(), 0);
      else { f.render(); assert.equal(f.status(), '', `${transition}/${outcome} must suppress stale feedback`); }
      if (transition === 'selection') {
        assert.equal(f.copyButton().props.disabled, false);
        const next = f.start(); assert.equal(f.requests[1].text, 'TEXT B');
        f.requests[1].resolve(); await next; f.render(); assert.equal(f.status(), 'Copied sample text');
      }
      checks++;
    }
  }
  const focus = fixture(); focus.open(); assert.equal(focus.focused(), 'heading'); focus.back();
  focus.dialog.scrollTop = 73; focus.select('b'); assert.equal(focus.focused(), 'heading'); assert.equal(focus.dialog.scrollTop, 0);
  focus.dialog.scrollTop = 0; focus.back();
  assert(focus.focused().includes('B'), 'Back restores the originating B row');
  assert.equal(focus.dialog.scrollTop, 73, 'Back restores the exact saved list scroll'); checks++;
  const roster = fixture().rosterText(); assert(roster.includes('2')); assert(!roster.includes('3 sample participants')); checks++;
  console.log(`PASS ${checks} deferred clipboard/lifetime/roster scenarios against actual BrowserWorkspace handlers.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
