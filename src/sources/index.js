import Parser from 'rss-parser'; import {normalize} from '../filtering/events.js';
const parser=new Parser({timeout:10000});
export async function codeforces(){const j=await fetch('https://codeforces.com/api/contest.list',{headers:{'user-agent':'CP-WATCHER/1.0'}}).then(r=>r.json()); if(j.status!=='OK')throw Error('Codeforces API error'); return j.result.filter(x=>x.phase==='BEFORE').map(x=>normalize({externalId:String(x.id),name:x.name,organizer:'Codeforces',format:'online',competition_start:new Date(x.startTimeSeconds*1000).toISOString(),official_url:`https://codeforces.com/contests/${x.id}`,verification_status:'verified',major:false},'codeforces'));}
export async function rss(url,source){const f=await parser.parseURL(url); return (f.items||[]).map(i=>normalize({externalId:i.guid||i.link,name:i.title,organizer:source,official_url:i.link,announcement_url:i.link,description:i.contentSnippet,verification_status:'lead'},source));}
export const adapters={codeforces};
