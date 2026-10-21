import {loadConfig} from './config/index.js';
import {openDb,saveDb,all,one} from './storage/db.js';
import {adapters} from './sources/index.js';
import {isRelevant} from './filtering/events.js';
import {queueNotifications,sendQueued,sendTestEmail} from './notifications/index.js';
import {DateTime} from 'luxon';
import fs from 'node:fs';
const cfg=loadConfig(); const cmd=process.argv[2]||'status'; const file=cmd==='dry-run'?':memory:':cfg.dbPath; const {db}=await openDb(file); const now=DateTime.utc().toISO();
async function scan(dry=false){
 const found=[]; let successes=0;
 for(const [name,fn] of Object.entries(adapters)) { try { const ev=await fn(); successes++; found.push(...ev.filter(isRelevant)); if(!dry) db.run('INSERT OR REPLACE INTO source_health(source,last_attempt,last_success,error,result_count,enabled,auth_required) VALUES(?,?,?,?,?,?,?)',[name,now,now,null,ev.length,1,0]); }
 catch(e) { if(!dry) { const msg=String(e).slice(0,500); if(one(db,'SELECT source FROM source_health WHERE source=?',[name])) db.run('UPDATE source_health SET last_attempt=?,error=?,enabled=1 WHERE source=?',[now,msg,name]); else db.run('INSERT INTO source_health(source,last_attempt,error,enabled,auth_required) VALUES(?,?,?,?,?)',[name,now,msg,1,0]); } } }
 if(dry) return {found,successes,total:Object.keys(adapters).length};
 for(const e of found){const old=one(db,'SELECT * FROM events WHERE id=?',[e.id]); e._isNew=!old; const cols=['name','organizer','edition','category','format','city','country','venue','priority','competition_start','competition_end','registration_open','registration_deadline','deadline_timezone','team_size','eligibility','fee','official_url','registration_url','announcement_url','sources','verification_status','deadline_evidence','first_discovered','last_observed','last_updated','registration_status','major']; const vals=cols.map(k=>e[k]??old?.[k]??null); if(old) db.run(`UPDATE events SET ${cols.map(k=>k+'=?').join(',')} WHERE id=?`,[...vals,e.id]); else db.run(`INSERT INTO events(id,${cols.join(',')}) VALUES(?,${cols.map(()=>'?').join(',')})`,[e.id,...vals]); }
 queueNotifications(db,found,now); await sendQueued(db,cfg); const outcome=successes===0?0:(successes<Object.keys(adapters).length?2:1); db.run("INSERT INTO scans(started_at,finished_at,success,error) VALUES(?,?,?,?)",[now,DateTime.utc().toISO(),outcome,successes===0?'all sources failed':successes<Object.keys(adapters).length?'partial source failure':null]); saveDb({db,file}); return {found,successes,total:Object.keys(adapters).length};
}
async function lockedScan(dry=false){if(dry)return scan(true);const lock=`${file}.lock`;let fd;try{fd=fs.openSync(lock,'wx');return await scan(false);}catch(e){if(e.code==='EEXIST')throw new Error('another scan is already running');throw e;}finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}}
if(cmd==='test-email'){try{await sendTestEmail(cfg);console.log('Test email sent successfully.')}catch(e){console.error('Test email failed:',e.message);process.exitCode=1}}
else if(cmd==='init'){saveDb({db,file});console.log('Database initialized:',file)}
else if(cmd==='scan'||cmd==='dry-run'){const r=await lockedScan(cmd==='dry-run');console.log(JSON.stringify(r,null,2));if(cmd==='dry-run')console.log('Dry run: no database or notifications changed.');if(cmd==='scan'&&r.successes===0)process.exitCode=1}
else if(cmd==='status'){console.log({events:one(db,'SELECT count(*) count FROM events')?.count,lastScan:one(db,'SELECT finished_at FROM scans ORDER BY id DESC')?.finished_at,lastScanStatus:one(db,'SELECT success FROM scans ORDER BY id DESC')?.success,pendingNotifications:one(db,"SELECT count(*) count FROM notifications WHERE status='queued'")?.count,retryableNotifications:one(db,"SELECT count(*) count FROM notifications WHERE status='retryable'")?.count,failedNotifications:one(db,"SELECT count(*) count FROM notifications WHERE status='failed'")?.count,sources:all(db,'SELECT * FROM source_health')})}
else if(cmd==='upcoming'){console.table(all(db,"SELECT name,organizer,city,competition_start,registration_deadline,official_url FROM events WHERE competition_start IS NULL OR julianday(competition_start) >= julianday('now') ORDER BY priority,competition_start"))}
else if(cmd==='deadlines'){console.table(all(db,"SELECT name,registration_deadline,verification_status,registration_url,official_url FROM events WHERE registration_deadline IS NOT NULL AND julianday(registration_deadline) >= julianday('now') ORDER BY registration_deadline"))}




