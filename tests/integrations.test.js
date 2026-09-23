'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {EventEmitter}=require('node:events');
const welcome=require('../server/welcome');
class MemoryDb {
  constructor() { this.docs = new Map(); this.tail = Promise.resolve(); }
  collection(name) { return { doc: id => this.ref(`${name}/${id}`) }; }
  ref(path) { return { path, update: data => this.runTransaction(async tx => { tx.update({ path }, data); }) }; }
  runTransaction(fn) {
    const work = this.tail.then(async () => {
      const staged = new Map(this.docs);
      const result = await fn({
        get: async ref => ({ exists: staged.has(ref.path), data: () => staged.get(ref.path) }),
        set: (ref, data) => staged.set(ref.path, data),
        create: (ref, data) => { assert(!staged.has(ref.path)); staged.set(ref.path, data); },
        update: (ref, data) => staged.set(ref.path, { ...staged.get(ref.path), ...data })
      });
      this.docs = staged; return result;
    });
    this.tail = work.catch(() => {}); return work;
  }
}
function app(options={}) {
  const db=new MemoryDb(), calls=[]; let handler;
  const settings={apiKey:'test-key',replyTo:'example@example.com'};
  const fetcher=async(url,opts)=>{
    if(url.startsWith('https://ipwho.is/')) return {ok:true,json:async()=>({success:true,country_code:options.country || 'KR'})};
    calls.push({url,body:JSON.parse(opts.body)});
    if(url.includes('brevo')) return {ok:true,json:async()=>({messageId:'test-message'})};
    await new Promise(r=>setTimeout(r,10));
    calls.push({completedSlack:true});
    return {ok:!options.slackFail,status:503,statusText:'test failure'};
  };
  const context={Buffer,URL,AbortSignal,console:{log(){},info(){},warn(){},error(){}},process:{env:{SLACK_WAITLIST_WEBHOOK_URL:'https://slack.invalid/test'}},__dirname:path.resolve(__dirname,'..'),fetch:fetcher,
    require(name){
      if(name==='node:http')return{createServer(fn){handler=fn;return{listen(){}}}};
      if(name==='@google-cloud/firestore')return{Firestore:class{constructor(){return db}}};
      if(name==='./server/welcome')return{...welcome,saveSignup:(...args)=>welcome.saveSignup(...args,true),dispatchWelcome:(db,id)=>welcome.dispatchWelcome(db,id,settings,(job,settings)=>welcome.sendWelcome(job,settings,fetcher))};
      if(name.startsWith('./server/'))return require('../'+name.slice(2));
      return require(name);
    }};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8'),context);
  return{db,calls,entry(){return new Promise(resolve=>{
    const req={method:'GET',url:'/?utm_source=instagram',headers:{'x-forwarded-for':'1.0.16.1','user-agent':'Mobile Safari'}};
    const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v},writeHead(code,headers){this.statusCode=code;Object.assign(this.headers,headers)},end(){resolve({status:this.statusCode,headers:this.headers})}};
    handler(req,res);
  })},submit(data){return new Promise(resolve=>{
    const req=new EventEmitter();req.method='POST';req.url='/api/waitlist';req.headers={};
    const res={statusCode:0,setHeader(){},writeHead(code){this.statusCode=code},end(body){resolve({status:this.statusCode,body:JSON.parse(body),slackCompleted:calls.some(c=>c.completedSlack)})}};
    handler(req,res);req.emit('data',JSON.stringify(data));req.emit('end');
  })}};
}
const payload=language=>({email:'test@example.com',consent:true,consent_version:'2026-09-17',language,survey_version:'2026-09-24',age_group:'25-30',subscription_plan:'premium',features:['sleep_share','timeline_archive'],feature:'sleep_share, timeline_archive',feature_label:'수면 공유, 둘만의 기록'});
for(const language of ['ko','ja'])test(`complete ${language} signup persists survey, queues one localized email and awaits Slack`,async()=>{
 const a=app(),result=await a.submit(payload(language));assert.equal(result.status,200);assert.equal(result.slackCompleted,true);
 const saved=a.db.docs.get(`sai_waitlist_${language==='ja'?'jp':'kr'}/test@example.com`);
 assert.equal(saved.age_group,'25-30');assert.equal(saved.subscription_plan,'premium');assert.equal(saved.country,null);assert.deepEqual(saved.features,['sleep_share','timeline_archive']);
 const mail=a.calls.find(c=>c.url?.includes('brevo'));assert(mail.body.htmlContent.includes(`lang="${language}"`));
 assert.equal(a.db.docs.get(`${welcome.OUTBOX}/${welcome.welcomeId('test@example.com')}`).status,'accepted');
 const slack=a.calls.find(c=>c.url?.includes('slack'));assert(slack.body.blocks[1].text.text.includes('25-30'));assert(slack.body.blocks[1].text.text.includes('프리미엄'));
 await a.submit(payload(language));assert.equal(a.calls.filter(c=>c.url?.includes('brevo')).length,1);
});
test('Slack failure does not undo a saved signup',async()=>{const a=app({slackFail:true});assert.equal((await a.submit(payload('ko'))).status,200);assert(a.db.docs.has('sai_waitlist_kr/test@example.com'));});
test('invalid survey never writes or sends notifications',async()=>{const a=app();assert.equal((await a.submit({...payload('ko'),age_group:'invalid'})).status,400);assert.equal(a.db.docs.size,0);assert.equal(a.calls.length,0);});

test('Japan entry temporarily redirects with campaign parameters and no shared cache',async()=>{const a=app({country:'JP'});const r=await a.entry();assert.equal(r.status,302);assert.equal(r.headers.Location,'/ja/?utm_source=instagram');assert.equal(r.headers['Cache-Control'],'private, no-store');});
