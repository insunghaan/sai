const test=require('node:test'),assert=require('node:assert/strict');
const {defaultLanguage,languagePreference}=require('../server/locale');
const req=(cookie='',agent='Mobile Safari')=>({headers:{cookie,'user-agent':agent}});
test('regional default is Japanese only for Japan',async()=>{for(const country of ['JP','KR','US','FR',null])assert.equal(await defaultLanguage(req(),async()=>country),country==='JP'?'ja':'ko');});
test('manual language choice survives country-based default',async()=>{assert.equal(await defaultLanguage(req('x=1; sai_language=ko'),async()=> 'JP'),'ko');assert.equal(await defaultLanguage(req('sai_language=ja'),async()=> 'KR'),'ja');assert.equal(languagePreference('sai_language=invalid'),null);});
test('failed lookup and crawlers retain Korean canonical homepage',async()=>{assert.equal(await defaultLanguage(req(),async()=>{throw Error('timeout')}),'ko');assert.equal(await defaultLanguage(req('', 'Googlebot'),async()=> 'JP'),'ko');});
