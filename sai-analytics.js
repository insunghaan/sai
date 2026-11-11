// One GA4 stream for both SAI languages. No form values are collected here.
(function () {
  'use strict';
  if (window.__saiAnalyticsInstalled) return;
  window.__saiAnalyticsInstalled = true;

  var measurementId = 'G-SKG7ZN4LEH';
  var production = window.location.hostname === '42sai.io' && !window.location.pathname.startsWith('/archive');
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

      // Meta Pixel (1410934320443457): initialize if not already loaded in <head>.
      if (!window.fbq) {
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', '1410934320443457');
        window.fbq('track', 'PageView');
      }
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
