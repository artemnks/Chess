'use strict';
// ci.js: проверки и матчи. Команды: perft | tactics | sync | regress <baseline.js> [игр] [мс] | elo --stockfish <команда> --levels 1600,1900 --games 20 --movetime 300
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');
const Chess=require('./rules.js');
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OPEN=['e4 e5 Nf3 Nc6 Bb5 a6','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6','d4 d5 c4 e6 Nc3 Nf6','d4 Nf6 c4 g6 Nc3 Bg7','e4 e6 d4 d5 Nc3 Nf6','c4 e5 Nc3 Nf6 Nf3 Nc6','e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5','Nf3 d5 g3 Nf6 Bg2 e6','e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4','d4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6','e4 e5 f4 exf4 Nf3 g5 h4 g4','e4 d5 exd5 Qxd5 Nc3 Qa5'];
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n);return i>=0?process.argv[i+1]:d};
const load=f=>require(path.resolve(f));
const cmd=process.argv[2];

function adjudicate(g){const V={p:1,n:3,b:3,r:5,q:9,k:0};let s=0;for(const p of g.b)if(p)s+=(p.c==='w'?1:-1)*V[p.t];return s>=4?'1-0':s<=-4?'0-1':'1/2-1/2'}
async function playGame(W,B,open){
 const g=new Chess();for(const m of open.split(' '))g.move(m);
 const hist=g.history({verbose:true}).map(m=>[m.from,m.to,m.promotion||'']),seen=new Map();let ply=hist.length;
 for(;;){
  if(!g.legal().length)return{res:g.in_check()?(g.turn()==='w'?'0-1':'1-0'):'1/2-1/2',hist};
  if(g.half>=100||g.insufficient())return{res:'1/2-1/2',hist};
  const k=g.fen().split(' ').slice(0,4).join(' ');seen.set(k,(seen.get(k)||0)+1);
  if(seen.get(k)>=3)return{res:'1/2-1/2',hist};
  if(ply>=300)return{res:adjudicate(g),hist};
  const r=await(g.turn()==='w'?W:B).move(hist);
  if(!r||!g.move({from:r.from,to:r.to,promotion:r.promo||undefined}))return{res:g.turn()==='w'?'0-1':'1-0',hist};
  hist.push([r.from,r.to,r.promo||'']);ply++;
 }
}
const mine=(E,ms)=>({move:async h=>{E.setup(START,h);return E.think(ms,60)}});
const eloDiff=p=>p<=0.001?-999:p>=0.999?999:-400*Math.log10(1/p-1);

class UCI{
 constructor(c){const a=c.split(' ');this.p=cp.spawn(a[0],a.slice(1));this.buf='';this.ls=[];this.all=[];
  this.p.stdout.on('data',d=>{this.buf+=d;let i;while((i=this.buf.indexOf('\n'))>=0){const l=this.buf.slice(0,i).trim();this.buf=this.buf.slice(i+1);this.all.push(l);this.ls=this.ls.filter(f=>!f(l))}})}
 send(s){this.p.stdin.write(s+'\n')}
 wait(prefix){return new Promise(r=>this.ls.push(l=>{if(l.startsWith(prefix)){r(l);return true}return false}))}
 async init(){this.send('uci');await this.wait('uciok');this.send('setoption name Threads value 1');this.send('setoption name Hash value 16');await this.ready()}
 async ready(){this.send('isready');await this.wait('readyok')}
 async setElo(e){
  const o=this.all.find(l=>l.includes('name UCI_Elo ')),mn=o&&/min (\d+)/.exec(o),mx=o&&/max (\d+)/.exec(o);
  const v=Math.max(mn?+mn[1]:e,Math.min(mx?+mx[1]:e,e));
  this.send('setoption name UCI_LimitStrength value true');this.send('setoption name UCI_Elo value '+v);await this.ready();return v;
 }
 player(ms){return{move:async h=>{
  this.send('position startpos'+(h.length?' moves '+h.map(m=>m.join('')).join(' '):''));
  this.send('go movetime '+ms);const l=await this.wait('bestmove'),m=l.split(' ')[1];
  if(!m||m==='(none)'||m==='0000')return null;return{from:m.slice(0,2),to:m.slice(2,4),promo:m.slice(4)};
 }}}
}

if(cmd==='perft'){
 const FE=load('./engine.js');let bad=0;
 for(const [n,f,d,e] of [['startpos','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',4,197281],['kiwipete','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',3,97862],['pos3','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',4,43238],['pos4','r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',3,9467],['pos5','rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',3,62379],['pos6','r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',3,89890]]){
  FE.setFen(f);const r=FE.perft(d,1);if(r!==e)bad++;console.log(r===e?'OK  ':'FAIL',n,r,e)}
 process.exit(bad?1:0);
}else if(cmd==='tactics'){
 const FE=load('./engine.js');let bad=0;
 for(const [n,f,e] of [['ладья берёт ферзя','3qk3/8/8/8/8/8/8/3RK3 w - - 0 1','d1d8'],['мат на последней горизонтали','6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1','a1a8'],['мат Шольца','r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4','h5f7'],['вилка конём','r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1','b5c7'],['ферзь без защиты','4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1','d1d5']]){
  FE.clear();FE.setup(f,[]);const r=FE.think(800,60),ok=r.from+r.to===e;if(!ok)bad++;console.log(ok?'OK  ':'FAIL',n,r.from+r.to,'ожидалось',e)}
 process.exit(bad?1:0);
}else if(cmd==='sync'){
 const src=fs.readFileSync('engine.js','utf8'),html=fs.readFileSync('index.html','utf8');
 const a=src.indexOf('/* ---------- БЫСТРЫЙ ДВИЖОК'),b=src.indexOf('})();',a)+5,ok=html.includes(src.slice(a,b));
 console.log(ok?'OK   движок в index.html совпадает с engine.js':'FAIL движок в index.html отличается от engine.js');process.exit(ok?0:1);
}else if(cmd==='regress'){
 const A=load(process.argv[3]),B=load('./engine.js'),games=+process.argv[4]||20,ms=+process.argv[5]||60;
 (async()=>{let w=0,d=0,l=0;
  for(let i=0;i<games;i++){A.clear&&A.clear();B.clear();const bw=i%2===0,r=await playGame(bw?mine(B,ms):mine(A,ms),bw?mine(A,ms):mine(B,ms),OPEN[(i>>1)%OPEN.length]);
   const s=r.res==='1/2-1/2'?.5:((r.res==='1-0')===bw?1:0);if(s===1)w++;else if(s===0)l++;else d++}
  const p=(w+d/2)/games,t=`Текущая версия против предыдущей: +${w} =${d} -${l} из ${games} (${(p*100).toFixed(1)}%, примерно ${eloDiff(p).toFixed(0)} Elo, погрешность большая)`;
  console.log(t);if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Сравнение с предыдущей версией\n'+t+'\n');
 })();
}else if(cmd==='elo'){
 const sf=arg('stockfish','stockfish'),levels=arg('levels','1600,1900,2200,2500').split(',').map(Number),games=+arg('games',20),mt=+arg('movetime',300),nw=+arg('workers',Math.min(4,os.cpus().length));
 const tasks=[];for(const lv of levels)for(let gi=0;gi<games;gi++)tasks.push({lv,gi});
 const chunks=Array.from({length:nw},()=>[]);tasks.forEach((t,i)=>chunks[i%nw].push(t));
 let res=[],done=0,live=0;const t0=Date.now();
 for(const c of chunks){if(!c.length)continue;live++;const w=cp.fork(__filename,['eloworker']);w.on('message',o=>{res=res.concat(o);if(++done===live)fin()});w.send({sf,tasks:c,mt})}
 function fin(){
  let out='### Результаты против Stockfish (с ограничением силы)\nВремя на ход: '+mt+' мс у обеих сторон. Это очень приблизительная оценка.\n\n| Уровень Stockfish | Партий | + = − | Очки | Оценка Elo |\n|---|---|---|---|---|\n',perfs=[],lines=[];
  for(const lv of levels){const rs=res.filter(r=>r.lv===lv),w=rs.filter(r=>r.s===1).length,l=rs.filter(r=>r.s===0).length,d=rs.length-w-l,p=rs.length?(w+d/2)/rs.length:0,pf=lv+eloDiff(Math.min(.97,Math.max(.03,p)));
   if(p>=.1&&p<=.9)perfs.push(pf);out+=`| ${rs[0]?rs[0].real:lv} | ${rs.length} | ${w} ${d} ${l} | ${(p*100).toFixed(0)}% | ${pf.toFixed(0)} |\n`}
  for(const r of res)lines.push(`${r.lv} ${r.mineWhite?'белые':'чёрные'} ${r.res} ${r.hist.map(m=>m.join('')).join(' ')}`);
  const all=perfs.length?perfs:levels.map(lv=>lv),est=perfs.length?perfs.reduce((a,b)=>a+b,0)/perfs.length:null;
  out+='\n'+(est?`**Итоговая оценка: около ${est.toFixed(0)} Elo** (среднее по уровням, где счёт был между 10% и 90%).`:'Счёт на всех уровнях слишком крайний: добавьте уровни ближе к силе движка.')+` Время: ${((Date.now()-t0)/1000).toFixed(0)} с.\nШкала UCI_Elo у Stockfish приблизительная и зависит от времени на ход.\n`;
  console.log(out);fs.writeFileSync('games.txt',lines.join('\n'));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,out);
 }
}else if(cmd==='eloworker'){
 process.on('message',async t=>{
  const E=load('./engine.js'),u=new UCI(t.sf);await u.init();const out=[];
  for(const k of t.tasks){
   const real=await u.setElo(k.lv);u.send('ucinewgame');await u.ready();E.clear();
   const mineWhite=k.gi%2===0,m=mine(E,t.mt),s=u.player(t.mt),r=await playGame(mineWhite?m:s,mineWhite?s:m,OPEN[(k.gi>>1)%OPEN.length]);
   out.push({lv:k.lv,real,mineWhite,res:r.res,hist:r.hist,s:r.res==='1/2-1/2'?.5:((r.res==='1-0')===mineWhite?1:0)});
  }
  u.send('quit');process.send(out);process.exit(0);
 });
}else{console.log('Команды: perft | tactics | sync | regress <baseline.js> [игр] [мс] | elo --stockfish <команда> --levels 1600,1900 --games 20 --movetime 300');process.exit(2)}
