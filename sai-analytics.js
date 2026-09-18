// One GA4 stream for both SAI languages. No form values are collected here.
(function () {
  'use strict';
  if (window.__saiAnalyticsInstalled) return;
  window.__saiAnalyticsInstalled = true;

  var measurementId = 'G-SKG7ZN4LEH';
  var production = window.location.hostname === '42sai.io';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function language() {
    return document.documentElement.lang.toLowerCase().split('-')[0] === 'ja' ? 'ja' : 'ko';
  }

  function start() {
    var currentLanguage = language();
    window.gtag('js', new Date());
    window.gtag('set', { site_language: currentLanguage });
    // Local previews keep a test queue without loading Google or sending visits.
    if (production) {
      window.gtag('config', measurementId);
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
      document.head.appendChild(script);

      // Microsoft Clarity: use the same production-only guard as GA4.
      window.clarity = window.clarity || function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
      var clarityScript = document.createElement('script');
      clarityScript.async = true;
      clarityScript.src = 'https://www.clarity.ms/tag/yk2omp3xul';
      document.head.appendChild(clarityScript);
    }

    new MutationObserver(function () {
      var nextLanguage = language();
      if (nextLanguage === currentLanguage) return;
      var previousLanguage = currentLanguage;
      currentLanguage = nextLanguage;
      window.gtag('set', { site_language: nextLanguage });
      window.gtag('event', 'language_change', {
        site_language: nextLanguage,
        previous_language: previousLanguage
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());
