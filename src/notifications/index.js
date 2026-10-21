import nodemailer from 'nodemailer';
import { DateTime } from 'luxon';

const MAX_ATTEMPTS = 3;
export function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function transport(cfg, overrides = {}) { if (cfg.smtpTransport && typeof cfg.smtpTransport.sendMail === 'function') return cfg.smtpTransport; const smtp = cfg.smtp || {}; return nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.password }, ...overrides }); }
function verifiedDeadline(event) { return event.registration_deadline && (!event.verification_status || ['verified', 'confirmed'].includes(String(event.verification_status).toLowerCase())); }
export function queueNotifications(db, events, now = DateTime.utc().toISO()) {
  for (const event of events) {
    const deadline = verifiedDeadline(event) ? event.registration_deadline : null;
    const priority = Number(event.priority); const isNew = event._isNew === true || event.isNew === true;
    if (isNew && (event.major || priority <= 2 || deadline)) db.run('INSERT OR IGNORE INTO notifications(event_id,type,deadline_version,status,created_at) VALUES(?,?,?,?,?)', [event.id, 'new', deadline || 'none', 'queued', now]);
    if (!deadline) continue;
    const deadlineTime = DateTime.fromISO(deadline, { setZone: true }); const current = DateTime.fromISO(now, { setZone: true });
    if (!deadlineTime.isValid || !current.isValid) continue;
    const hours = deadlineTime.diff(current, 'hours').hours;
    if (hours > 24 && hours <= 120) db.run('INSERT OR IGNORE INTO notifications(event_id,type,deadline_version,status,created_at) VALUES(?,?,?,?,?)', [event.id, 'four-day', deadline, 'queued', now]);
    else if (hours > 0 && hours <= 24) db.run('INSERT OR IGNORE INTO notifications(event_id,type,deadline_version,status,created_at) VALUES(?,?,?,?,?)', [event.id, 'final', deadline, 'queued', now]);
  }
}
function messageFor(n) {
  const link = n.registration_url || n.official_url || null; const type = n.type === 'four-day' ? 'Registration Closing Soon' : n.type === 'final' ? 'Final Reminder' : 'New Competition'; const format = n.format || (n.city ? 'In person' : 'Online'); const reason = n.type === 'new' ? (Number(n.priority) <= 2 ? 'A high-priority nearby or major competition.' : 'A relevant programming competition.') : 'Registration deadline reminder.';
  const text = [`Competition: ${n.name}`, `Organizer: ${n.organizer || 'Unknown'}`, `Format: ${format}`, `Location: ${n.city || 'Online'}`, `Competition date: ${n.competition_start || 'Unknown'}`, `Registration deadline: ${n.registration_deadline || 'Unknown'}`, `Why it is relevant: ${reason}`, link ? `Registration / official information: ${link}` : 'Official information: unavailable'].join('\n');
  const html = `<h2>${esc(n.name)}</h2><p>Organizer: ${esc(n.organizer || 'Unknown')}<br>Format: ${esc(format)}<br>Location: ${esc(n.city || 'Online')}<br>Competition date: ${esc(n.competition_start || 'Unknown')}<br>Registration deadline: ${esc(n.registration_deadline || 'Unknown')}<br>Why it is relevant: ${esc(reason)}</p>${link ? `<p><a href="${esc(link)}">Registration / official information</a></p>` : ''}`; return { subject: `[CP WATCHER] ${type}: ${n.name}`, text, html };
}
export async function sendQueued(db, cfg) {
  if (!cfg.emailEnabled) return 0; const rows = []; const st = db.prepare("SELECT n.*,e.name,e.organizer,e.city,e.format,e.priority,e.competition_start,e.registration_deadline,e.registration_url,e.official_url FROM notifications n JOIN events e ON e.id=n.event_id WHERE n.status IN ('queued','retryable') AND n.attempts < ? ORDER BY n.id"); st.bind([MAX_ATTEMPTS]); while (st.step()) rows.push(st.getAsObject()); st.free(); if (!rows.length) return 0;
  const smtp = cfg.smtp || {}; const mailer = transport(cfg); let sent = 0;
  for (const n of rows) { try { await mailer.sendMail({ from: smtp.user, to: smtp.to, ...messageFor(n) }); db.run("UPDATE notifications SET status='sent',sent_at=?,last_error=NULL WHERE id=?", [DateTime.utc().toISO(), n.id]); sent++; } catch (error) { const attempts = Number(n.attempts || 0) + 1; const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'retryable'; const detail = String(error?.message || error || 'SMTP send failed').replace(/(pass(word)?|auth|user(name)?)\s*[:=]\s*\S+/ig, '$1=[redacted]').slice(0, 500); db.run('UPDATE notifications SET status=?,attempts=?,last_error=? WHERE id=?', [status, attempts, detail, n.id]); } }
  return sent;
}
export async function sendTestEmail(cfg) { if (!cfg.emailEnabled) throw new Error('EMAIL_ENABLED is not true'); const smtp = cfg.smtp || {}; if (!smtp.host || !smtp.port || !smtp.user || !smtp.password || !smtp.to) throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and ALERT_EMAIL are required'); await transport(cfg).sendMail({ from: smtp.user, to: smtp.to, subject: '[CP WATCHER] SMTP test', text: 'CP-WATCHER SMTP test succeeded.', html: '<p>CP-WATCHER SMTP test succeeded.</p>' }); }
export { MAX_ATTEMPTS };
