import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { normalize } from '../filtering/events.js';
const parser = new Parser({ timeout: 10000 });
const headers = { 'user-agent': 'CP-WATCHER/1.0 (+https://github.com/i250685-aliirtiza/CP-WATCHER)' };
export async function response(url, options = {}) { const r=await fetch(url,{...options,headers:{...headers,...(options.headers||{})},signal:AbortSignal.timeout(options.timeout||15000)}); if(!r.ok) throw new Error(`HTTP ${r.status} from ${url}`); return r; }
export async function json(url, options={}) { return (await response(url,{...options,headers:{accept:'application/json',...(options.headers||{})}})).json(); }
export async function text(url, options={}) { return (await response(url,options)).text(); }
const event=(raw,source)=>normalize({...raw,externalId:raw.externalId||raw.id||raw.url||raw.official_url},source);
export async function codeforces(){const d=await json('https://codeforces.com/api/contest.list');if(d.status!=='OK')throw Error('Codeforces API error');return d.result.filter(x=>x.phase==='BEFORE').map(x=>event({externalId:String(x.id),name:x.name,organizer:'Codeforces',format:'online',competition_start:x.startTimeSeconds?new Date(x.startTimeSeconds*1000).toISOString():null,competition_end:x.durationSeconds?new Date((x.startTimeSeconds+x.durationSeconds)*1000).toISOString():null,official_url:`https://codeforces.com/contests/${x.id}`,verification_status:'verified'},'codeforces'));}
export async function atcoder(){const html=await text('https://atcoder.jp/contests/');const $=cheerio.load(html);const out=[];$('#contest-table-upcoming tbody tr').each((_,row)=>{const a=$(row).find('a').first();const time=$(row).find('time').attr('datetime')||$(row).find('time').text().trim();if(a.attr('href')&&a.text().trim())out.push(event({externalId:a.attr('href'),name:a.text().trim(),organizer:'AtCoder',format:'online',official_url:new URL(a.attr('href'),'https://atcoder.jp').href,competition_start:time||null,verification_status:'verified'},'atcoder'));});return out;}
export async function codechef(){const d=await json('https://www.codechef.com/api/list/contests/all');return (d.future_contests||[]).map(x=>event({externalId:x.contest_code,name:x.contest_name,organizer:'CodeChef',format:'online',competition_start:x.start_date,competition_end:x.end_date,official_url:`https://www.codechef.com/${x.contest_code}`,registration_url:`https://www.codechef.com/${x.contest_code}`,verification_status:'verified'},'codechef'));}
export async function leetcode(){ const d=await json('https://leetcode.com/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'{ allContests { title titleSlug startTime duration } }'})}); return (d.data?.allContests||[]).filter(x=>x.startTime).map(x=>event({externalId:x.titleSlug,name:x.title,organizer:'LeetCode',format:'online',competition_start:new Date(x.startTime*1000).toISOString(),competition_end:x.duration?new Date((x.startTime+x.duration)*1000).toISOString():null,official_url:"https://leetcode.com/contest/"+x.titleSlug+"/",verification_status:'verified'},'leetcode')); }
export async function rss(source,url,organizer){const feed=await parser.parseString(await text(url));return (feed.items||[]).map(i=>event({externalId:i.guid||i.link,name:i.title,organizer,official_url:i.link,announcement_url:i.link,competition_start:i.isoDate||i.pubDate,description:i.contentSnippet||i.content,verification_status:'lead'},source));}
export const icpc=()=>rss('icpc','https://icpc.global/regionals/feed','ICPC');
export const calico=()=>rss('calico','https://calico.cs.berkeley.edu/feed.xml','CALICO');
export const ieeextreme=()=>rss('ieeextreme','https://www.ieee.org/rss/ieeextreme.xml','IEEEXtreme');
export const meta=()=>rss('meta-hacker-cup','https://engineering.fb.com/feed/','Meta Hacker Cup');
export async function configuredPages(){const entries=(process.env.CP_WATCHER_EVENT_FEEDS||'').split(',').map(x=>x.trim()).filter(Boolean);const out=[];for(const entry of entries){const [url,format='rss',organizer='Configured official source',city='']=entry.split('|');if(format==='html'){const html=await text(url);const $=cheerio.load(html);$('a').each((_,a)=>{const name=$(a).text().replace(/\s+/g,' ').trim();const href=$(a).attr('href');if(href&&/(contest|programming|icpc|nascon|speed)/i.test(name))out.push(event({externalId:href,name,organizer,city:city||null,format:'in-person',official_url:new URL(href,url).href,announcement_url:url,verification_status:'lead'},'configured'));});}else out.push(...await rss('configured',url,organizer));}return out;}
export const adapters={codeforces,atcoder,codechef,leetcode,icpc,calico,ieeextreme,meta,configured:configuredPages};




