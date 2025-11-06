(function(global){
  'use strict';

  const LANG_KEY = 'resonance-lang';
  const DEFAULT_SUPPORTED = ['en','es','pt'];

  let messages = {};
  let supported = DEFAULT_SUPPORTED.slice();
  let currentLang = 'en';
  const listeners = new Set();
  const selects = new Set();
  let syncQuery = true;

  function mergeMessages(base, extra){
    const result = Object.assign({}, base);
    if(!extra) return result;
    Object.keys(extra).forEach(lang => {
      const dict = Object.assign({}, result[lang] || {});
      Object.assign(dict, extra[lang] || {});
      result[lang] = dict;
    });
    return result;
  }

  function getQueryLang(){
    try{
      const qs = new URLSearchParams(global.location.search);
      const fromQuery = (qs.get('lang')||'').toLowerCase();
      return fromQuery || null;
    }catch(err){
      return null;
    }
  }

  function detectInitial(){
    const fromQuery = getQueryLang();
    if(fromQuery && supported.includes(fromQuery)) return fromQuery;
    try{
      const saved = global.localStorage.getItem(LANG_KEY);
      if(saved && supported.includes(saved)) return saved;
    }catch(err){/* ignore */}
    const nav = (global.navigator && (global.navigator.languages && global.navigator.languages[0]))
      || (global.navigator && global.navigator.language)
      || 'en';
    const base = String(nav||'en').slice(0,2).toLowerCase();
    return supported.includes(base) ? base : 'en';
  }

  function tr(key, fallback){
    const dict = messages[currentLang] || messages.en || {};
    if(dict && Object.prototype.hasOwnProperty.call(dict, key)){
      return dict[key];
    }
    const enDict = messages.en || {};
    if(enDict && Object.prototype.hasOwnProperty.call(enDict, key)){
      return enDict[key];
    }
    return fallback != null ? fallback : key;
  }

  function translateAttributes(root){
    (root || document).querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if(!key) return;
      const fallback = el.innerHTML;
      el.innerHTML = tr(key, fallback);
    });

    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      if(el.hasAttribute('data-i18n-html')) return;
      const key = el.getAttribute('data-i18n');
      if(!key) return;
      const fallback = el.getAttribute('data-i18n-fallback') || el.textContent;
      el.textContent = tr(key, fallback);
    });

    (root || document).querySelectorAll('[data-i18n-attr]').forEach(el => {
      const attrs = el.getAttribute('data-i18n-attr');
      if(!attrs) return;
      const key = el.getAttribute('data-i18n');
      if(!key) return;
      const firstAttr = attrs.split(',').map(s=>s.trim()).filter(Boolean);
      if(!firstAttr.length) return;
      const fallback = el.getAttribute(firstAttr[0]);
      const val = tr(key, fallback);
      firstAttr.forEach(attr => {
        el.setAttribute(attr, val);
      });
    });

    document.title = tr('doc_title', document.title);
    const metaDesc = document.querySelector('meta[name="description"]');
    if(metaDesc){
      metaDesc.setAttribute('content', tr('doc_description', metaDesc.getAttribute('content')));
    }
  }

  function updateDocumentLang(){
    if(document && document.documentElement){
      document.documentElement.setAttribute('lang', currentLang);
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }

  function notify(){
    translateAttributes();
    updateDocumentLang();
    listeners.forEach(fn => {
      try{ fn(currentLang, tr); }
      catch(err){ console.error(err); }
    });
  }

  function setLanguage(lang){
    if(!supported.includes(lang)) return;
    currentLang = lang;
    try{
      global.localStorage.setItem(LANG_KEY, lang);
    }catch(err){/* ignore */}
    selects.forEach(sel => {
      if(sel) sel.value = lang;
    });
    if(syncQuery){
      try{
        const url = new URL(global.location.href);
        url.searchParams.set('lang', lang);
        global.history.replaceState({}, '', url);
      }catch(err){/* ignore */}
    }
    notify();
  }

  function bindSelect(select){
    if(!select) return;
    selects.add(select);
    select.value = currentLang;
    const label = tr('lang_label','Language');
    select.setAttribute('aria-label', label);
    select.setAttribute('title', label);
    select.addEventListener('change', ev => {
      setLanguage(ev.target.value);
    });
  }

  function init(options){
    options = options || {};
    supported = Array.isArray(options.supported) && options.supported.length
      ? options.supported.slice()
      : DEFAULT_SUPPORTED.slice();
    syncQuery = options.syncQuery !== false;
    messages = mergeMessages(messages, options.messages || {});
    currentLang = options.initialLang || detectInitial();
    updateDocumentLang();

    const select = options.select || document.querySelector(options.selectSelector || '.lang-select');
    if(select){
      bindSelect(select);
    }
    if(Array.isArray(options.additionalSelects)){
      options.additionalSelects.forEach(bindSelect);
    }

    notify();

    return api;
  }

  function onChange(fn){
    if(typeof fn === 'function'){
      listeners.add(fn);
      try{ fn(currentLang, tr); } catch(err){ console.error(err); }
    }
    return function(){ listeners.delete(fn); };
  }

  function registerMessages(extra){
    messages = mergeMessages(messages, extra || {});
    notify();
  }

  function translateLabel(value, fallback){
    if(value && typeof value === 'object'){
      if(Object.prototype.hasOwnProperty.call(value, currentLang)){
        return value[currentLang];
      }
      if(Object.prototype.hasOwnProperty.call(value, 'en')){
        return value.en;
      }
      const firstKey = Object.keys(value)[0];
      if(firstKey) return value[firstKey];
    }
    return value != null ? value : fallback;
  }

  const api = {
    init,
    t: tr,
    getLanguage: () => currentLang,
    setLanguage,
    onChange,
    registerMessages,
    translateLabel,
    supported: () => supported.slice(),
    apply: () => notify()
  };

  global.ReI18n = api;

})(window);
