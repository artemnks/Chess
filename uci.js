'use strict';
// uci.js: движок по протоколу UCI (Arena, cutechess-cli, Lichess-bot и т.д.). Запуск: node uci.js
const FE=require('./engine.js'),rl=require('readline').createInterface({input:process.stdin});
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let fen=START,moves=[];
const say=s=>process.stdout.write(s+'\n');
rl.on('line',line=>{
 const t=line.trim().split(/\s+/),c=t[0];
 if(c==='uci'){say('id name MiniFE\nid author Claude\noption name Hash type spin default 16 min 1 max 1024\noption name Threads type spin default 1 min 1 max 1\nuciok')}
 else if(c==='isready')say('readyok');
 else if(c==='ucinewgame')FE.clear();
 else if(c==='position'){
  let i=1;
  if(t[1]==='startpos'){fen=START;i=2}else if(t[1]==='fen'){fen=t.slice(2,8).join(' ');i=8}
  moves=t[i]==='moves'?t.slice(i+1):[];
 }else if(c==='go'){
  const p={};for(let i=1;i<t.length;i++)if(['movetime','wtime','btime','winc','binc','depth','movestogo'].includes(t[i]))p[t[i]]=+t[i+1];
  const white=((fen.split(' ')[1]||'w')==='w')===(moves.length%2===0);
  let ms=1000,hard=0;
  if(p.movetime)ms=p.movetime;
  else if(p.wtime!==undefined||p.btime!==undefined){const left=(white?p.wtime:p.btime)||1000,inc=(white?p.winc:p.binc)||0;ms=Math.max(30,left/(p.movestogo||30)+inc*0.8);hard=Math.min(ms*2.5,left/5)}
  if(!FE.setup(fen,moves.map(m=>[m.slice(0,2),m.slice(2,4),m.slice(4)])))FE.setFen(fen);
  const r=FE.think(Math.max(20,ms),p.depth||60,hard);
  if(!r){say('bestmove 0000');return}
  const sc=Math.abs(r.score)>99900?'mate '+(r.score>0?1:-1)*Math.ceil((100000-Math.abs(r.score))/2):'cp '+r.score;
  say(`info depth ${r.depth} score ${sc} nodes ${r.nodes}`);say(`bestmove ${r.from}${r.to}${r.promo}`);
 }else if(c==='quit')process.exit(0);
});
