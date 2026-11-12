'use strict';
const AGES = new Set(['under20', '20-24', '25-30', '31-34', '35+']);
const PREVIOUS_AGES = new Set(['under20', '20-25', '25-30', '30-35', '35+']);
const PLANS = new Set(['basic', 'premium']);
const FEATURES = new Set(['sleep_share', 'heartbeat_send', 'timeline_archive']);
const GENDERS = {male: '남성', female: '여성'};
const COLORS = {gold: '골드', silver: '실버', rose_gold: '로즈골드', black: '블랙'};
function parseSurvey(data) {
  const gender = {};
  if (data.survey_version === '2026-11-12-gender' || data.gender !== undefined) {
    if (typeof data.gender !== 'string' || !Object.hasOwn(GENDERS, data.gender)) throw new Error('Please select a valid gender.');
    gender.gender = data.gender;
    gender.gender_label = GENDERS[data.gender];
  }
  if (!['2026-09-24','2026-09-24-v2','2026-10-27-color','2026-11-12-gender'].includes(data.survey_version)) return gender;
  const ages = data.survey_version === '2026-09-24' ? PREVIOUS_AGES : AGES;
  if (!ages.has(data.age_group) || !PLANS.has(data.subscription_plan) ||
      !Array.isArray(data.features) || !data.features.length || !data.features.every(x => FEATURES.has(x))) {
    throw new Error('Please select a valid age group, feature and subscription plan.');
  }
  const color = {};
  if (['2026-10-27-color','2026-11-12-gender'].includes(data.survey_version)) {
    if (!Object.hasOwn(COLORS, data.ring_color)) throw new Error('Please select a valid ring color.');
    color.ring_color = data.ring_color;
    color.ring_color_label = COLORS[data.ring_color];
  }
  return { ...color, ...gender, survey_version: data.survey_version, age_group: data.age_group,
    subscription_plan: data.subscription_plan, features: [...new Set(data.features)] };
}
module.exports = { parseSurvey };

