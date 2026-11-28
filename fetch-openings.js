'use strict';
// fetch-openings.js: скачивает список дебютов Lichess (репозиторий lichess-org/chess-openings) и собирает book.json для страницы.
// Для проверки без интернета: OPENINGS_DIR=папка_с_a.tsv_b.tsv node fetch-openings.js
const fs=require('fs'),path=require('path'),Chess=require('./rules.js');
const BASE='https://raw.githubusercontent.com/lichess-org/chess-openings/master/';
async function text(f){
 if(process.env.OPENINGS_DIR)return fs.readFileSync(path.join(process.env.OPENINGS_DIR,f+'.tsv'),'utf8');
 const r=await fetch(BASE+f+'.tsv');if(!r.ok)throw new Error('Не удалось скачать '+f+'.tsv: '+r.status);return r.text();
}
(async()=>{
 const out=[],seen=new Set();let bad=0,long=0;
 for(const f of ['a','b','c','d','e']){
  let t;try{t=await text(f)}catch(e){if(process.env.OPENINGS_DIR)continue;throw e}
  for(const line of t.split('\n').slice(1)){
   const [eco,name,pgn]=line.split('\t');if(!pgn)continue;
   const sans=pgn.replace(/\d+\.+/g,' ').trim().split(/\s+/).filter(Boolean);
   if(sans.length>24){long++;continue}
   const g=new Chess();let ok=true;for(const s of sans)if(!g.move(s)){ok=false;break}
   if(!ok){bad++;continue}
   const key=sans.join(' ');if(seen.has(key))continue;seen.add(key);out.push([name,sans.length,key]);
  }
 }
 fs.writeFileSync('book.json',JSON.stringify(out));
 console.log(`book.json: ${out.length} линий (пропущено: ${bad} с ошибками, ${long} длиннее 24 полуходов)`);
})().catch(e=>{console.error(e.message);process.exit(1)});
