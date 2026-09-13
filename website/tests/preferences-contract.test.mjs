import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultPreferences, normalizePreferences, parsePreferences, serializePreferences, shouldSubmitMessage } from "../app/workspace/preferences-contract.ts";

test("browser preferences recover safely from unavailable, malformed, and old storage", () => {
  for (const raw of [null, "", "{broken", "null", "[]", '"legacy"']) assert.deepEqual(parsePreferences(raw), defaultPreferences);
  assert.deepEqual(parsePreferences('{"stars":false,"sendShortcut":"mod-enter"}'), { ...defaultPreferences, stars:false, sendShortcut:"mod-enter" });
  assert.deepEqual(normalizePreferences({ stars:"false", galaxy:0, motion:"full", textSize:"huge", sendShortcut:"any-key" }), defaultPreferences);
});

test("saved preference serialization allowlists presentation values and excludes sensitive data", () => {
  const result = serializePreferences({ stars:false, galaxy:false, textSize:"large", motion:"reduced", sendShortcut:"mod-enter",
    token:"do-not-save", apiKey:"do-not-save", prompt:"private-draft", email:"private@example.test" });
  assert.equal(result.includes("do-not-save"), false);
  assert.equal(result.includes("private"), false);
  assert.deepEqual(JSON.parse(result), { stars:false, galaxy:false, backgroundDim:0.35, motion:"reduced", textSize:"large", sendShortcut:"mod-enter" });
});

test("send shortcuts preserve newlines, IME composition, and modifier boundaries", () => {
  const enter = { key:"Enter", shiftKey:false, metaKey:false, ctrlKey:false, altKey:false, isComposing:false };
  assert.equal(shouldSubmitMessage("enter", enter), true);
  assert.equal(shouldSubmitMessage("mod-enter", enter), false);
  assert.equal(shouldSubmitMessage("mod-enter", { ...enter, metaKey:true }), true);
  assert.equal(shouldSubmitMessage("mod-enter", { ...enter, ctrlKey:true }), true);
  assert.equal(shouldSubmitMessage("enter", { ...enter, metaKey:true }), false);
  for (const patch of [{ shiftKey:true }, { isComposing:true }, { altKey:true }, { key:"a" }]) {
    assert.equal(shouldSubmitMessage("enter", { ...enter, ...patch }), false);
    assert.equal(shouldSubmitMessage("mod-enter", { ...enter, metaKey:true, ...patch }), false);
  }
});

test("background dimming rejects nonfinite values and clamps bounds", () => {
  assert.equal(normalizePreferences({backgroundDim: Infinity}).backgroundDim, 0.35);
  assert.equal(normalizePreferences({backgroundDim: -1}).backgroundDim, 0.15);
  assert.equal(normalizePreferences({backgroundDim: 3}).backgroundDim, 0.85);
});
