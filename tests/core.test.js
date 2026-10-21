import test from 'node:test'; import assert from 'node:assert/strict'; import {parseDeadline} from '../src/parsing/deadlines.js'; import {isRelevant,normalize} from '../src/filtering/events.js';
test('deadline extraction',()=>assert.ok(parseDeadline('Registration closes November 20, 2026')?.iso.startsWith('2026-11-20')));
test('unknown deadline',()=>assert.equal(parseDeadline('Competition on November 20'),null));
test('filtering',()=>{assert.equal(isRelevant({name:'Speed Programming Contest'}),true);assert.equal(isRelevant({name:'AI Hackathon'}),false)});
test('priority',()=>assert.equal(normalize({name:'x',city:'Islamabad'},'x').priority,1));

test('deadline preserves exact time and timezone',()=>{const x=parseDeadline('Registration deadline: November 20, 2026 23:59 PKT'); assert.equal(x.iso,'2026-11-20T23:59:00.000+05:00'); assert.equal(x.verification_status,'verified')});
