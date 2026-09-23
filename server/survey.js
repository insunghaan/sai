'use strict';
const AGES = new Set(['under20', '20-24', '25-30', '31-34', '35+']);
const PREVIOUS_AGES = new Set(['under20', '20-25', '25-30', '30-35', '35+']);
const PLANS = new Set(['basic', 'premium']);
const FEATURES = new Set(['sleep_share', 'heartbeat_send', 'timeline_archive']);
function parseSurvey(data) {
  if (!['2026-09-24','2026-09-24-v2'].includes(data.survey_version)) return {};
  const ages = data.survey_version === '2026-09-24-v2' ? AGES : PREVIOUS_AGES;
  if (!ages.has(data.age_group) || !PLANS.has(data.subscription_plan) ||
      !Array.isArray(data.features) || !data.features.length || !data.features.every(x => FEATURES.has(x))) {
    throw new Error('Please select a valid age group, feature and subscription plan.');
  }
  return { survey_version: data.survey_version, age_group: data.age_group,
    subscription_plan: data.subscription_plan, features: [...new Set(data.features)] };
}
module.exports = { parseSurvey };
