import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configuredPages } from '../src/sources/index.js';
import { openDb, saveDb, one } from '../src/storage/db.js';
import { queueNotifications, sendQueued } from '../src/notifications/index.js';

test('official HTML detail deadline flows to persisted reminder and sent state', async () => {
  const oldFetch = global.fetch; const oldFeeds = process.env.CP_WATCHER_EVENT_FEEDS;
  process.env.CP_WATCHER_EVENT_FEEDS = 'https://official.test/events|html|FAST-NUCES|Islamabad';
  global.fetch = async url => new Response(url.endsWith('/events') ? '<a href="/events/nascon">NaSCon Speed Programming</a>' : '<h1>NaSCon Speed Programming</h1><p>Registration deadline: November 20, 2026 23:59 PKT</p>', {status:200, headers:{'content-type':'text/html'}});
  const events = await configuredPages();
  assert.equal(events.length, 1); assert.equal(events[0].verification_status, 'verified'); assert.match(events[0].registration_deadline, /^2026-11-20/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpw-')); const file = path.join(dir, 'watch.sqlite'); const {db} = await openDb(file);
  const e = {...events[0], _isNew:true}; db.run('INSERT INTO events(id,name,organizer,format,city,priority,competition_start,registration_deadline,deadline_timezone,official_url,verification_status) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[e.id,e.name,e.organizer,e.format,e.city,e.priority,'2026-11-25T12:00:00Z',e.registration_deadline,e.deadline_timezone,e.official_url,e.verification_status]);
  const now='2026-11-16T12:00:00Z'; queueNotifications(db,[e],now); const mail=[]; const cfg={emailEnabled:true,smtp:{user:'u',to:'a@example.test'},smtpTransport:{sendMail:async m=>mail.push(m)}}; assert.equal(await sendQueued(db,cfg),2); saveDb({db,file}); const reopened=await openDb(file); assert.equal(one(reopened.db,"SELECT count(*) count FROM notifications WHERE status='sent'").count,2); queueNotifications(reopened.db,[e],now); assert.equal(one(reopened.db,'SELECT count(*) count FROM notifications').count,2); assert.equal(mail.length,2);
  global.fetch = oldFetch; if (oldFeeds === undefined) delete process.env.CP_WATCHER_EVENT_FEEDS; else process.env.CP_WATCHER_EVENT_FEEDS = oldFeeds;
});

test('temporary source failure does not erase persisted events', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpw-')); const file = path.join(dir, 'watch.sqlite'); const {db} = await openDb(file);
  db.run("INSERT INTO events(id,name,registration_deadline,verification_status) VALUES('x','Contest','2026-12-01T00:00:00Z','verified')"); saveDb({db,file}); const reopened=await openDb(file); assert.equal(one(reopened.db,'SELECT registration_deadline FROM events WHERE id=\'x\'').registration_deadline,'2026-12-01T00:00:00Z');
});
