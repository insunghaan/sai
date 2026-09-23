const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSurvey } = require('../server/survey');
const valid = {survey_version:'2026-09-24',age_group:'25-30',subscription_plan:'premium',features:['sleep_share','timeline_archive']};
test('new survey keeps answers without inferring residence or budget',()=>{
 assert.deepEqual(parseSurvey(valid),valid);
 assert.equal(parseSurvey(valid).country,undefined);
});
test('new survey rejects missing answers and retired feature options',()=>{
 for(const patch of [{age_group:''},{subscription_plan:'gold'},{features:[]},{features:['sleep_garden']}]) assert.throws(()=>parseSurvey({...valid,...patch}));
});
test('legacy archived signup payloads remain accepted',()=>{assert.deepEqual(parseSurvey({country:'KR',budget:'20-30'}),{});});

test('v2 age ranges validate without breaking already open v1 forms',()=>{
 for(const age of ['under20','20-24','25-30','31-34','35+']) assert.equal(parseSurvey({...valid,survey_version:'2026-09-24-v2',age_group:age}).age_group,age);
 for(const age of ['20-25','30-35']) { assert.throws(()=>parseSurvey({...valid,survey_version:'2026-09-24-v2',age_group:age})); assert.equal(parseSurvey({...valid,age_group:age}).age_group,age); }
});
