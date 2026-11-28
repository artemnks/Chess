(function(root){
const F='abcdefgh';
const sqName=i=>F[i%8]+(8-(i>>3));
const sqIdx=s=>(8-(+s[1]))*8+F.indexOf(s[0]);
const N=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KG=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const BD=[[-1,-1],[-1,1],[1,-1],[1,1]],RD=[[-1,0],[1,0],[0,-1],[0,1]];
const ok=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
function Chess(fen){this.stack=[];this.load(fen||'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')}
const P=Chess.prototype;
P.reset=function(){this.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')};
P.load=function(fen){
 const t=fen.split(' ');this.b=new Array(64).fill(null);let i=0;
 for(const ch of t[0]){if(ch==='/')continue;if(/\d/.test(ch))i+=+ch;else this.b[i++]={t:ch.toLowerCase(),c:ch===ch.toLowerCase()?'b':'w'}}
 this.t=t[1]||'w';this.cr=t[2]||'-';this.ep=(t[3]&&t[3]!=='-')?sqIdx(t[3]):-1;
 this.half=+(t[4]||0);this.full=+(t[5]||1);this.stack=[];return true;
};
P.att=function(i,by){
 const r=i>>3,c=i&7,b=this.b,pr=by==='w'?r+1:r-1;
 for(const dc of[-1,1]){const cc=c+dc;if(ok(pr,cc)){const p=b[pr*8+cc];if(p&&p.c===by&&p.t==='p')return true}}
 for(const[dr,dc]of N){if(ok(r+dr,c+dc)){const p=b[(r+dr)*8+c+dc];if(p&&p.c===by&&p.t==='n')return true}}
 for(const[dr,dc]of KG){if(ok(r+dr,c+dc)){const p=b[(r+dr)*8+c+dc];if(p&&p.c===by&&p.t==='k')return true}}
 for(const[dirs,ts]of[[BD,'bq'],[RD,'rq']])for(const[dr,dc]of dirs){
  let rr=r+dr,cc=c+dc;
  while(ok(rr,cc)){const p=b[rr*8+cc];if(p){if(p.c===by&&ts.includes(p.t))return true;break}rr+=dr;cc+=dc}
 }
 return false;
};
P.ksq=function(col){for(let i=0;i<64;i++){const p=this.b[i];if(p&&p.t==='k'&&p.c===col)return i}return -1};
P.pseudo=function(){
 const me=this.t,en=me==='w'?'b':'w',b=this.b,out=[];
 for(let i=0;i<64;i++){
  const p=b[i];if(!p||p.c!==me)continue;const r=i>>3,c=i&7;
  if(p.t==='p'){
   const dr=me==='w'?-1:1,start=me==='w'?6:1,last=me==='w'?0:7,r1=r+dr;
   const pp=(t,cap)=>{if(r1===last)for(const pr of'qrbn')out.push({f:i,t,p:'p',cap,pr,fl:'p'});else out.push({f:i,t,p:'p',cap,fl:cap?'c':'n'})};
   if(!b[r1*8+c]){pp(r1*8+c);if(r===start&&!b[(r+2*dr)*8+c])out.push({f:i,t:(r+2*dr)*8+c,p:'p',fl:'b'})}
   for(const dc of[-1,1]){const cc=c+dc;if(!ok(r1,cc))continue;const tg=b[r1*8+cc];
    if(tg&&tg.c===en)pp(r1*8+cc,tg.t);else if(r1*8+cc===this.ep)out.push({f:i,t:r1*8+cc,p:'p',cap:'p',fl:'e'})}
  }else if(p.t==='n'||p.t==='k'){
   for(const[dr,dc]of(p.t==='n'?N:KG)){const rr=r+dr,cc=c+dc;if(!ok(rr,cc))continue;const tg=b[rr*8+cc];
    if(!tg)out.push({f:i,t:rr*8+cc,p:p.t,fl:'n'});else if(tg.c===en)out.push({f:i,t:rr*8+cc,p:p.t,cap:tg.t,fl:'c'})}
   if(p.t==='k'){
    const home=me==='w'?60:4;
    if(i===home&&!this.att(i,en)){
     const K=me==='w'?'K':'k',Q=me==='w'?'Q':'q';
     if(this.cr.includes(K)&&!b[i+1]&&!b[i+2]&&b[i+3]&&b[i+3].t==='r'&&!this.att(i+1,en)&&!this.att(i+2,en))out.push({f:i,t:i+2,p:'k',fl:'c0'});
     if(this.cr.includes(Q)&&!b[i-1]&&!b[i-2]&&!b[i-3]&&b[i-4]&&b[i-4].t==='r'&&!this.att(i-1,en)&&!this.att(i-2,en))out.push({f:i,t:i-2,p:'k',fl:'c0'});
    }
   }
  }else{
   const dirs=p.t==='b'?BD:p.t==='r'?RD:BD.concat(RD);
   for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;
    while(ok(rr,cc)){const tg=b[rr*8+cc];
     if(!tg)out.push({f:i,t:rr*8+cc,p:p.t,fl:'n'});
     else{if(tg.c===en)out.push({f:i,t:rr*8+cc,p:p.t,cap:tg.t,fl:'c'});break}
     rr+=dr;cc+=dc}}
  }
 }
 return out;
};
P.make=function(m){
 const snap={b:this.b.slice(),t:this.t,cr:this.cr,ep:this.ep,half:this.half,full:this.full};
 const b=this.b,p=b[m.f],capt=b[m.t];
 b[m.t]=m.pr?{t:m.pr,c:p.c}:p;b[m.f]=null;
 if(m.fl==='e')b[m.t+(p.c==='w'?8:-8)]=null;
 if(m.fl==='c0'){if(m.t>m.f){b[m.t-1]=b[m.t+1];b[m.t+1]=null}else{b[m.t+1]=b[m.t-2];b[m.t-2]=null}}
 const rm=s=>{for(const ch of s)this.cr=this.cr.replace(ch,'')};
 if(p.t==='k')rm(p.c==='w'?'KQ':'kq');
 for(const sq of[m.f,m.t]){if(sq===63)rm('K');if(sq===56)rm('Q');if(sq===7)rm('k');if(sq===0)rm('q')}
 if(!this.cr)this.cr='-';
 this.ep=m.fl==='b'?(m.f+m.t)/2:-1;
 this.half=(p.t==='p'||capt||m.fl==='e')?0:this.half+1;
 if(this.t==='b')this.full++;
 this.t=this.t==='w'?'b':'w';
 return snap;
};
P.restore=function(s){this.b=s.b;this.t=s.t;this.cr=s.cr;this.ep=s.ep;this.half=s.half;this.full=s.full};
P.legal=function(){
 const out=[],me=this.t;
 for(const m of this.pseudo()){const s=this.make(m);const bad=this.att(this.ksq(me),this.t);this.restore(s);if(!bad)out.push(m)}
 return out;
};
P.sanOf=function(m){
 let s;
 if(m.fl==='c0')s=m.t>m.f?'O-O':'O-O-O';
 else{
  const cap=m.cap||m.fl==='e';
  s=(m.p==='p'?(cap?F[m.f&7]:''):m.p.toUpperCase())+(cap?'x':'')+sqName(m.t)+(m.pr?'='+m.pr.toUpperCase():'');
 }
 const me=this.t,sn=this.make(m);const chk=this.att(this.ksq(this.t),me);this.restore(sn);
 return s+(chk?'+':'');
};
P.pub=function(m){
 const self=this,o={color:this.b[m.f].c,from:sqName(m.f),to:sqName(m.t),piece:m.p,flags:m.fl,_m:m};
 if(m.cap)o.captured=m.cap;if(m.fl==='e')o.captured='p';if(m.pr)o.promotion=m.pr;
 let cache;
 Object.defineProperty(o,'san',{enumerable:true,get(){if(cache===undefined)cache=self.sanOf(m);return cache},set(v){cache=v}});
 return o;
};
P.moves=function(opt){
 let ms=this.legal();
 if(opt&&opt.square){const s=sqIdx(opt.square);ms=ms.filter(m=>m.f===s)}
 const ps=ms.map(m=>this.pub(m));
 if(opt&&opt.verbose){for(const o of ps)o.san;return ps}return ps.map(o=>o.san);
};
P.moveSan=function(san){
 const s=san.replace(/[+#!?]+$/,''),ls=this.legal();
 if(/^[O0]-[O0](-[O0])?$/.test(s)){const k=s.length===3;return ls.find(x=>x.fl==='c0'&&(k?x.t>x.f:x.t<x.f))||null}
 const m=/^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([NBRQ]))?$/.exec(s);if(!m)return null;
 const pc=(m[1]||'P').toLowerCase(),c=ls.filter(x=>x.p===pc&&sqName(x.t)===m[4]&&(!m[2]||F[x.f&7]===m[2])&&(!m[3]||8-(x.f>>3)===+m[3])&&(m[5]?x.pr===m[5].toLowerCase():!x.pr));
 return c.length===1?c[0]:null;
};
P.move=function(arg){
 const ls=this.legal();let m=null;
 if(typeof arg==='string'){
  m=this.moveSan(arg);
 }else m=ls.find(x=>sqName(x.f)===arg.from&&sqName(x.t)===arg.to&&(!x.pr||x.pr===arg.promotion))||null;
 if(!m)return null;
 const o=this.pub(m);o.san;
 const snap=this.make(m);this.stack.push({snap,o});return o;
};
P.undo=function(){const e=this.stack.pop();if(!e)return null;this.restore(e.snap);return e.o};
P.history=function(opt){return this.stack.map(e=>opt&&opt.verbose?e.o:e.o.san)};
P.turn=function(){return this.t};
P.in_check=function(){return this.att(this.ksq(this.t),this.t==='w'?'b':'w')};
P.insufficient=function(){
 const ps=this.b.filter(p=>p&&p.t!=='k');
 return ps.length===0||(ps.length===1&&'nb'.includes(ps[0].t));
};
P.in_checkmate=function(){return this.in_check()&&this.legal().length===0};
P.in_draw=function(){return(!this.in_check()&&this.legal().length===0)||this.half>=100||this.insufficient()};
P.game_over=function(){return this.legal().length===0||this.half>=100||this.insufficient()};
P.get=function(sq){const p=this.b[sqIdx(sq)];return p?{type:p.t,color:p.c}:null};
P.board=function(){const o=[];for(let r=0;r<8;r++){const row=[];for(let c=0;c<8;c++){const p=this.b[r*8+c];row.push(p?{type:p.t,color:p.c}:null)}o.push(row)}return o};
P.fen=function(){
 let s='';
 for(let r=0;r<8;r++){let e=0;for(let c=0;c<8;c++){const p=this.b[r*8+c];if(!p)e++;else{if(e){s+=e;e=0}s+=p.c==='w'?p.t.toUpperCase():p.t}}if(e)s+=e;if(r<7)s+='/'}
 return s+' '+this.t+' '+this.cr+' '+(this.ep>=0?sqName(this.ep):'-')+' '+this.half+' '+this.full;
};
P.pgn=function(){return this.stack.map((e,i)=>(i%2===0?(i/2+1)+'. ':'')+e.o.san).join(' ')};
P.perft=function(d){if(d===0)return 1;let n=0;for(const m of this.legal()){const s=this.make(m);n+=this.perft(d-1);this.restore(s)}return n};
root.Chess=Chess;if(typeof module!=='undefined')module.exports=Chess;
})(typeof window!=='undefined'?window:globalThis);
