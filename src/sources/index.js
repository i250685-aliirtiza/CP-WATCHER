import Parser from 'rss-parser';
import { normalize } from '../filtering/events.js';

const parser = new Parser({ timeout: 10000 });
const headers = { 'user-agent': 'CP-WATCHER/1.0 (+https://github.com/i250685-aliirtiza/CP-WATCHER)' };

export async function json(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) }, signal: AbortSignal.timeout(options.timeout || 15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

const event = (raw, source) => normalize({ ...raw, externalId: raw.externalId || raw.id || raw.url || raw.official_url }, source);

export async function codeforces() {
  const data = await json('https://codeforces.com/api/contest.list');
  if (data.status !== 'OK') throw new Error('Codeforces API error');
  return data.result.filter(x => x.phase === 'BEFORE').map(x => event({ externalId: String(x.id), name: x.name, organizer: 'Codeforces', format: 'online', competition_start: x.startTimeSeconds ? new Date(x.startTimeSeconds * 1000).toISOString() : null, competition_end: x.durationSeconds ? new Date((x.startTimeSeconds + x.durationSeconds) * 1000).toISOString() : null, official_url: `https://codeforces.com/contests/${x.id}`, verification_status: 'verified' }, 'codeforces'));
}

export async function atcoder() {
  const feed = await parser.parseURL('https://atcoder.jp/contests/');
  return (feed.items || []).map(i => event({ externalId: i.link, name: i.title, organizer: 'AtCoder', format: 'online', official_url: i.link, announcement_url: i.link, competition_start: i.isoDate || i.pubDate, verification_status: 'lead' }, 'atcoder'));
}

export async function codechef() {
  const data = await json('https://www.codechef.com/api/list/contests/all');
  return (data.future_contests || []).map(x => event({ externalId: x.contest_code, name: x.contest_name, organizer: 'CodeChef', format: 'online', competition_start: x.start_date, competition_end: x.end_date, registration_deadline: x.end_date, official_url: `https://www.codechef.com/${x.contest_code}`, registration_url: `https://www.codechef.com/${x.contest_code}`, verification_status: 'verified' }, 'codechef'));
}

// LeetCode exposes a public GraphQL endpoint; failures are isolated by the scanner.
export async function leetcode() {
  const body = { query: '{ allContests { title titleSlug startTime duration } }' };
  const data = await json('https://leetcode.com/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return (data.data?.allContests || []).filter(x => x.startTime).map(x => event({ externalId: x.titleSlug, name: x.title, organizer: 'LeetCode', format: 'online', competition_start: new Date(x.startTime * 1000).toISOString(), competition_end: x.duration ? new Date((x.startTime + x.duration) * 1000).toISOString() : null, official_url: `https://leetcode.com/contest/${x.titleSlug}/`, verification_status: 'verified' }, 'leetcode'));
}

export async function rss(source, url, organizer) {
  const feed = await parser.parseURL(url);
  return (feed.items || []).map(i => event({ externalId: i.guid || i.link, name: i.title, organizer, official_url: i.link, announcement_url: i.link, competition_start: i.isoDate || i.pubDate, description: i.contentSnippet || i.content, verification_status: 'lead' }, source));
}
export const icpc = () => rss('icpc', 'https://icpc.global/regionals/feed', 'ICPC');
export const calico = () => rss('calico', 'https://calico.cs.berkeley.edu/feed.xml', 'CALICO');
export const ieeextreme = () => rss('ieeextreme', 'https://www.ieee.org/rss/ieeextreme.xml', 'IEEEXtreme');
export const meta = () => rss('meta-hacker-cup', 'https://engineering.fb.com/feed/', 'Meta Hacker Cup');

export async function configuredPages() {
  const urls = (process.env.CP_WATCHER_EVENT_FEEDS || '').split(',').map(x => x.trim()).filter(Boolean);
  const output = [];
  for (const url of urls) output.push(...await rss('configured', url, 'Configured official source'));
  return output;
}

export const adapters = { codeforces, atcoder, codechef, leetcode, icpc, calico, ieeextreme, meta, configured: configuredPages };
