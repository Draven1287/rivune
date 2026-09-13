import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConnectionSettings, validateAPIFields } from "../app/workspace/connections-contract.ts";

const settings = () => ({ cli: [{ id:"gemini", title:"Gemini", command:"gemini", isDefault:false, installed:true, supported:false, custom:false }], api:[{provider:"openai",title:"OpenAI",hasKey:true,modelID:"fixture-model"}] });
test("discovery stays separate from chat support and retains only public configuration", () => {
  const result = parseConnectionSettings({...settings(), secret:"discard",futureField:"discard"});
  assert.equal(result.cli[0].installed,true);
  assert.equal(result.cli[0].supported,false);
  assert.equal(result.secret,undefined);
  assert.equal(result.api[0].hasKey,true);
});
test("rejects secret-bearing, duplicate, or malformed API and CLI settings", () => {
  const good = settings();
  for (const bad of [null,{}, {...good,api:[{...good.api[0],apiKey:"never-render"}]}, {...good,api:[{...good.api[0],provider:"unknown"}]}, {...good,cli:[good.cli[0],good.cli[0]]}, {...good,cli:[{...good.cli[0],installed:"true"}]}]) assert.throws(()=>parseConnectionSettings(bad),/Could not read/);
});
test("API fields validate model identifiers and require a new or saved key", () => {
  assert.equal(validateAPIFields("fixture-not-real","model",false),null);
  assert.equal(validateAPIFields("","model",true),null);
  assert.match(validateAPIFields("","model",false),/API key/);
  for (const key of ["has space", "has\nnewline", "x".repeat(4097)]) assert.match(validateAPIFields(key,"model",false),/API key/);
  for (const model of ["", "..", "https://bad.test", "model --tools"]) assert.match(validateAPIFields("fixture",model,false),/model ID/);
});
