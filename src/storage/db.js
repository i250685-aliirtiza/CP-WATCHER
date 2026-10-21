import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from '../config/index.js';
let SQL;
export async function openDb(file) {
  if (!SQL) SQL = await initSqlJs({ locateFile: f => path.resolve('node_modules/sql.js/dist', f) });
  ensureDir(file);
  const db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  db.run(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,name TEXT NOT NULL,organizer TEXT,edition TEXT,category TEXT,format TEXT,city TEXT,country TEXT,venue TEXT,priority INTEGER,competition_start TEXT,competition_end TEXT,registration_open TEXT,registration_deadline TEXT,deadline_timezone TEXT,team_size TEXT,eligibility TEXT,fee TEXT,official_url TEXT,registration_url TEXT,announcement_url TEXT,sources TEXT,verification_status TEXT,deadline_evidence TEXT,first_discovered TEXT,last_observed TEXT,last_updated TEXT,registration_status TEXT,major INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS evidence(id INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT,url TEXT,source TEXT,evidence TEXT,observed_at TEXT);
CREATE TABLE IF NOT EXISTS source_health(source TEXT PRIMARY KEY,last_attempt TEXT,last_success TEXT,error TEXT,http_status INTEGER,result_count INTEGER,enabled INTEGER,auth_required INTEGER);
CREATE TABLE IF NOT EXISTS scans(id INTEGER PRIMARY KEY AUTOINCREMENT,started_at TEXT,finished_at TEXT,success INTEGER,error TEXT);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT,type TEXT,deadline_version TEXT,status TEXT,attempts INTEGER DEFAULT 0,last_error TEXT,created_at TEXT,sent_at TEXT,UNIQUE(event_id,type,deadline_version));`);
  return { db, file };
}
export function saveDb({ db, file }) { const tmp = `${file}.tmp-${process.pid}`; fs.writeFileSync(tmp, Buffer.from(db.export())); fs.renameSync(tmp, file); }
export function all(db, sql, params = []) { const st = db.prepare(sql); st.bind(params); const out=[]; while(st.step()) out.push(st.getAsObject()); st.free(); return out; }
export function one(db, sql, params = []) { return all(db, sql, params)[0]; }
