/**
 * site-settings.js — Personalización del sitio (nombre del blog y color).
 * Se carga justo después de la configuración de Tailwind en cada página.
 * Guarda en localStorage (por navegador). Sin ajustes guardados, el sitio se ve como el original.
 */
(function () {
  'use strict';
  var KEY = 'siteSettings.v1';
  var DEFAULT_NAME = 'Aula Abierta';
  var PRESETS = { azul: 215, verde: 150, morado: 265, rojo: 355, ambar: 38 };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  // --- Color helpers ---
  function hexToHsl(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null;
    var n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, d = max - min;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h = Math.round(h * 60); if (h < 0) h += 360;
    }
    return h;
  }
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))); };
    return '#' + [f(0), f(8), f(4)].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function palette(h) {
    return {
      'primary': hsl(h, 70, 12), 'primary-container': hsl(h, 55, 18), 'on-primary-container': hsl(h, 40, 68),
      'primary-fixed': hsl(h, 80, 90), 'primary-fixed-dim': hsl(h, 60, 78), 'inverse-primary': hsl(h, 60, 78),
      'on-primary-fixed': hsl(h, 70, 14), 'on-primary-fixed-variant': hsl(h, 40, 32), 'surface-tint': hsl(h, 25, 41),
      'secondary': hsl(h, 80, 30), 'secondary-container': hsl(h, 85, 66), 'secondary-fixed': hsl(h, 90, 90),
      'secondary-fixed-dim': hsl(h, 85, 78), 'on-secondary-container': hsl(h, 100, 22),
      'on-secondary-fixed': hsl(h, 100, 12), 'on-secondary-fixed-variant': hsl(h, 100, 23)
    };
  }
  function hueOf(s) {
    if (s.preset && PRESETS[s.preset] != null) return PRESETS[s.preset];
    if (s.custom) return hexToHsl(s.custom);
    return null;
  }

  // --- Aplicar color: modifica la config de Tailwind antes de que genere el CSS ---
  var settings = load();
  var hue = hueOf(settings);
  if (hue != null && window.tailwind && tailwind.config) {
    var colors = tailwind.config.theme.extend.colors;
    var p = palette(hue);
    for (var k in p) if (k in colors) colors[k] = p[k];
  }

  // --- Aplicar nombre del blog ---
  function name() { return (settings.blogName || '').trim() || DEFAULT_NAME; }
  function swap(str) { return str.indexOf(DEFAULT_NAME) > -1 ? str.split(DEFAULT_NAME).join(name()) : str; }

  function applyName(root) {
    if (name() === DEFAULT_NAME) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) { if (n.nodeValue.indexOf(DEFAULT_NAME) > -1) list.push(n); }
    list.forEach(function (t) { t.nodeValue = swap(t.nodeValue); });
    if (root.querySelectorAll) root.querySelectorAll('[alt],[title],[aria-label]').forEach(function (el) {
      ['alt', 'title', 'aria-label'].forEach(function (a) {
        var v = el.getAttribute(a); if (v && v.indexOf(DEFAULT_NAME) > -1) el.setAttribute(a, swap(v));
      });
    });
  }
  function init() {
    document.title = swap(document.title);
    applyName(document.body);
    if (name() !== DEFAULT_NAME) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.type === 'characterData') { if (m.target.nodeValue.indexOf(DEFAULT_NAME) > -1) m.target.nodeValue = swap(m.target.nodeValue); }
          else m.addedNodes.forEach(function (nd) { if (nd.nodeType === 1 || nd.nodeType === 3) applyName(nd.nodeType === 3 ? nd.parentNode : nd); });
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  // Botón flotante de acceso a "Mi perfil y personalización" (todas las páginas menos perfil.html)
  function addFab() {
    if (/perfil\.html$/.test(location.pathname) || document.getElementById('ss-fab')) return;
    var a = document.createElement('a');
    a.id = 'ss-fab'; a.href = 'perfil.html'; a.title = 'Mi perfil y personalización';
    a.setAttribute('aria-label', 'Mi perfil y personalización');
    a.style.cssText = 'position:fixed;right:14px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:60;width:48px;height:48px;border-radius:50%;background:' +
      ((window.tailwind && tailwind.config.theme.extend.colors['primary-container']) || '#0f2042') +
      ';color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.25);text-decoration:none';
    a.innerHTML = '<span class="material-symbols-outlined" style="font-size:24px">settings</span>';
    document.body.appendChild(a);
  }
  var _init = init; init = function () { _init(); addFab(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // --- API pública (la usa perfil.html) ---
  window.SiteSettings = {
    PRESETS: PRESETS, DEFAULT_NAME: DEFAULT_NAME, palette: palette, hexToHsl: hexToHsl,
    get: load, save: save, reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    name: name
  };
})();
