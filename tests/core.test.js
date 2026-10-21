import test from 'node:test'; import assert from 'node:assert/strict'; import {parseDeadline} from '../src/parsing/deadlines.js'; import {isRelevant,normalize} from '../src/filtering/events.js';
test('deadline extraction',()=>assert.ok(parseDeadline('Registration closes November 20, 2026')?.iso.startsWith('2026-11-20')));
test('unknown deadline',()=>assert.equal(parseDeadline('Competition on November 20'),null));
test('filtering',()=>{assert.equal(isRelevant({name:'Speed Programming Contest'}),true);assert.equal(isRelevant({name:'AI Hackathon'}),false)});
test('priority',()=>assert.equal(normalize({name:'x',city:'Islamabad'},'x').priority,1));
