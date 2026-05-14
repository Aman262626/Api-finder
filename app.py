from flask import Flask, request, jsonify, render_template_string
from bs4 import BeautifulSoup
import requests

app = Flask(__name__)

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Phone Tracker - Professional Lookup</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0e1a;color:#e2e8f0;min-height:100vh}
.bg-grid{position:fixed;inset:0;background-image:
  radial-gradient(circle at 20% 50%,rgba(99,102,241,.08) 0%,transparent 50%),
  radial-gradient(circle at 80% 20%,rgba(168,85,247,.08) 0%,transparent 50%),
  radial-gradient(circle at 50% 80%,rgba(59,130,246,.06) 0%,transparent 50%);
  pointer-events:none;z-index:0}
.container{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:20px}

header{text-align:center;padding:40px 0 30px}
.logo{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#6366f1,#a855f7);font-size:28px;font-weight:800;margin-bottom:16px;box-shadow:0 8px 32px rgba(99,102,241,.3)}
header h1{font-size:32px;font-weight:800;background:linear-gradient(135deg,#818cf8,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px}
header p{color:#64748b;font-size:14px}

.search-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;margin-bottom:24px;backdrop-filter:blur(12px)}
.search-box h2{font-size:18px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.search-box h2 .icon{width:36px;height:36px;border-radius:10px;background:rgba(99,102,241,.15);display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:18px}
.input-row{display:flex;gap:12px}
.input-row input{flex:1;padding:14px 18px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;font-size:16px;outline:none;transition:.2s}
.input-row input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
.input-row input::placeholder{color:#475569}
.btn{padding:14px 28px;border:none;border-radius:14px;font-weight:700;font-size:15px;cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:8px}
.btn-primary{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;box-shadow:0 4px 20px rgba(99,102,241,.3)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(99,102,241,.4)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-sm{padding:8px 16px;font-size:12px;border-radius:10px}

.spinner{display:inline-block;width:20px;height:20px;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

.error-box{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:14px;padding:16px;color:#f87171;margin-bottom:20px;font-size:14px}

/* History */
.history-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:20px;margin-bottom:24px}
.history-box h3{font-size:14px;color:#64748b;margin-bottom:12px;font-weight:600;display:flex;align-items:center;gap:8px}
.history-chips{display:flex;flex-wrap:wrap;gap:8px}
.history-chip{padding:8px 16px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.15);border-radius:10px;color:#a5b4fc;font-size:13px;cursor:pointer;transition:.2s;font-family:monospace}
.history-chip:hover{background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.3)}
.history-clear{padding:6px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15);border-radius:8px;color:#f87171;font-size:11px;cursor:pointer;margin-left:auto}
.history-clear:hover{background:rgba(239,68,68,.15)}

/* Summary */
.summary{background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(168,85,247,.1));border:1px solid rgba(99,102,241,.2);border-radius:20px;padding:24px;margin-bottom:24px;animation:fadeUp .4s ease}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media(max-width:600px){.summary-grid{grid-template-columns:1fr}}
.summary-item{text-align:center;padding:16px;background:rgba(0,0,0,.2);border-radius:14px;border:1px solid rgba(255,255,255,.06)}
.summary-item .s-icon{font-size:28px;margin-bottom:6px}
.summary-item .s-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.summary-item .s-value{font-size:16px;font-weight:700;color:#e2e8f0;word-break:break-word}

/* Category */
.category{margin-bottom:24px;animation:fadeUp .4s ease}
.cat-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}
.cat-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
.cat-title{font-size:16px;font-weight:700}
.cat-subtitle{font-size:12px;color:#64748b}

.result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:600px){.result-grid{grid-template-columns:1fr}}
.result-card{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:16px;transition:.2s;cursor:pointer;position:relative}
.result-card:hover{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.04)}
.result-card .label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:2px;font-weight:600}
.result-card .hindi{font-size:11px;color:#818cf8;margin-bottom:6px;font-style:italic}
.result-card .value{font-size:15px;color:#e2e8f0;font-weight:500;word-break:break-word}
.result-card .copy-hint{position:absolute;top:8px;right:10px;font-size:10px;color:#475569;opacity:0;transition:.2s}
.result-card:hover .copy-hint{opacity:1}
.copied-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:10px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:999;animation:fadeUp .3s ease;box-shadow:0 4px 20px rgba(34,197,94,.4)}

/* Action bar */
.action-bar{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:24px;margin-bottom:12px}
.btn-action{padding:12px 22px;border:none;border-radius:12px;font-weight:600;font-size:13px;cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:8px}
.btn-pdf{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#4ade80}
.btn-pdf:hover{background:rgba(34,197,94,.2)}
.btn-wa{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#4ade80}
.btn-wa:hover{background:rgba(34,197,94,.2)}
.btn-tg{background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);color:#60a5fa}
.btn-tg:hover{background:rgba(59,130,246,.2)}
.btn-copy-all{background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);color:#c084fc}
.btn-copy-all:hover{background:rgba(168,85,247,.2)}

footer{text-align:center;padding:40px 0 20px;color:#334155;font-size:13px}
footer a{color:#6366f1;text-decoration:none}
.tg-footer{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);color:#60a5fa;border-radius:12px;text-decoration:none;font-size:13px;font-weight:600;margin-top:10px;transition:.2s}
.tg-footer:hover{background:rgba(59,130,246,.2)}
.tg-footer svg{width:16px;height:16px;fill:currentColor}
</style>
</head>
<body>
<div class="bg-grid"></div>
<div class="container">
  <header>
    <div class="logo">P</div>
    <h1>Phone Tracker</h1>
    <p>Professional Phone Number Lookup Tool</p>
  </header>

  <div class="search-box">
    <h2><span class="icon">&#128270;</span> Search Number</h2>
    <div class="input-row">
      <input type="tel" id="phoneInput" placeholder="Phone number enter karo (e.g. 9876543210)" maxlength="15" autocomplete="off">
      <button class="btn btn-primary" id="searchBtn" onclick="searchNumber()">
        <span id="btnText">Search</span>
      </button>
    </div>
  </div>

  <!-- Search History -->
  <div id="historyBox" class="history-box" style="display:none">
    <h3>&#128338; Recent Searches <button class="history-clear" onclick="clearHistory()">Clear All</button></h3>
    <div class="history-chips" id="historyChips"></div>
  </div>

  <div id="errorBox" class="error-box" style="display:none"></div>

  <!-- Summary Card -->
  <div id="summaryBox" style="display:none"></div>

  <!-- Categorized Results -->
  <div id="categoriesBox" style="display:none"></div>

  <!-- Action Buttons -->
  <div id="actionBar" class="action-bar" style="display:none">
    <button class="btn-action btn-pdf" onclick="downloadPDF()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
      PDF Download
    </button>
    <button class="btn-action btn-wa" onclick="shareWhatsApp()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      WhatsApp Share
    </button>
    <button class="btn-action btn-tg" onclick="shareTelegram()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-1.98 9.33c-.15.67-.54.83-1.1.52l-3.03-2.23-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.06 5.57-5.03c.24-.22-.05-.34-.38-.13l-6.88 4.34-2.96-.93c-.64-.2-.66-.64.14-.95l11.58-4.46c.54-.2 1.01.13.83.95l.06-.06z"/></svg>
      Telegram Share
    </button>
    <button class="btn-action btn-copy-all" onclick="copyAllData()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      Copy All
    </button>
  </div>

  <footer>
    <a href="https://t.me/bmw_aura1" class="tg-footer" target="_blank">
      <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-1.98 9.33c-.15.67-.54.83-1.1.52l-3.03-2.23-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.06 5.57-5.03c.24-.22-.05-.34-.38-.13l-6.88 4.34-2.96-.93c-.64-.2-.66-.64.14-.95l11.58-4.46c.54-.2 1.01.13.83.95l.06-.06z"/></svg>
      Telegram Bot
    </a>
    <p style="margin-top:12px">Owner: @bmw_aura1</p>
  </footer>
</div>

<div id="copiedToast" class="copied-toast" style="display:none">Copied!</div>

<script>
let lastData = null;

const fieldMeta = {
  'Number':           { hindi: 'Phone number jo aapne search kiya', cat: 'personal', icon: '&#128222;' },
  'Owner Name':       { hindi: 'Is number ke maalik ka naam', cat: 'personal', icon: '&#128100;' },
  'Owner Personality':{ hindi: 'Maalik ki personality type', cat: 'personal', icon: '&#128161;' },
  'Language':         { hindi: 'Maalik ki bhasha / language', cat: 'personal', icon: '&#127463;' },
  'Owner Address':    { hindi: 'Maalik ka registered address', cat: 'personal', icon: '&#127968;' },
  'SIM card':         { hindi: 'Konsi company ka SIM hai (Jio, Airtel, etc.)', cat: 'network', icon: '&#128241;' },
  'Connection':       { hindi: 'Prepaid ya Postpaid connection type', cat: 'network', icon: '&#128279;' },
  'IMEI number':      { hindi: 'Phone ka unique IMEI number', cat: 'network', icon: '&#128272;' },
  'MAC address':      { hindi: 'Device ka MAC address (hardware ID)', cat: 'network', icon: '&#128421;' },
  'IP address':       { hindi: 'Current IP address jo detect hua', cat: 'network', icon: '&#127760;' },
  'Complaints':       { hindi: 'Is number ke khilaf kitni complaints hain', cat: 'network', icon: '&#9888;' },
  'Mobile State':     { hindi: 'Konse state me register hua hai', cat: 'location', icon: '&#127970;' },
  'Hometown':         { hindi: 'Maalik ka hometown / gaon', cat: 'location', icon: '&#127969;' },
  'Reference City':   { hindi: 'Sabse kareeb ka reference city', cat: 'location', icon: '&#127751;' },
  'Country':          { hindi: 'Konse desh ka number hai', cat: 'location', icon: '&#127758;' },
  'Mobile Locations': { hindi: 'Phone ka current/last known location', cat: 'location', icon: '&#128205;' },
  'Tracking History': { hindi: 'Pehle ke tracking records', cat: 'tracking', icon: '&#128200;' },
  'Tracker Id':       { hindi: 'Unique tracker ID jo assign hua', cat: 'tracking', icon: '&#128196;' },
  'Tower Locations':  { hindi: 'Kaunse mobile tower se connected hai', cat: 'tracking', icon: '&#128225;' }
};

const categories = {
  personal: { title: 'Personal Information', subtitle: 'Maalik ki jaankari', icon: '&#128100;', color: 'rgba(99,102,241,.15)' },
  network:  { title: 'Network & Device', subtitle: 'SIM aur device ki details', icon: '&#128241;', color: 'rgba(34,197,94,.15)' },
  location: { title: 'Location Details', subtitle: 'Location aur address', icon: '&#128205;', color: 'rgba(245,158,11,.15)' },
  tracking: { title: 'Tracking Info', subtitle: 'Tracking aur tower data', icon: '&#128225;', color: 'rgba(239,68,68,.15)' }
};

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('ph_history') || '[]'); } catch(e) { return []; }
}
function saveHistory(list) { localStorage.setItem('ph_history', JSON.stringify(list)); }

function renderHistory() {
  const list = loadHistory();
  const box = document.getElementById('historyBox');
  const chips = document.getElementById('historyChips');
  if (list.length === 0) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  chips.innerHTML = '';
  list.forEach(function(num) {
    var c = document.createElement('span');
    c.className = 'history-chip';
    c.textContent = num;
    c.onclick = function() {
      document.getElementById('phoneInput').value = num;
      searchNumber();
    };
    chips.appendChild(c);
  });
}

function addToHistory(num) {
  var list = loadHistory();
  list = list.filter(function(n) { return n !== num; });
  list.unshift(num);
  if (list.length > 8) list = list.slice(0, 8);
  saveHistory(list);
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem('ph_history');
  renderHistory();
}

function showToast(msg) {
  var t = document.getElementById('copiedToast');
  t.textContent = msg || 'Copied!';
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 1500);
}

function copyText(text) {
  navigator.clipboard.writeText(text);
  showToast('Copied: ' + text);
}

function searchNumber() {
  var input = document.getElementById('phoneInput');
  var btn = document.getElementById('searchBtn');
  var btnText = document.getElementById('btnText');
  var errorBox = document.getElementById('errorBox');
  var number = input.value.trim();

  if (!number) { showError('Phone number enter karo!'); return; }

  errorBox.style.display = 'none';
  document.getElementById('summaryBox').style.display = 'none';
  document.getElementById('categoriesBox').style.display = 'none';
  document.getElementById('actionBar').style.display = 'none';
  btn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span>';

  fetch('/api?number=' + encodeURIComponent(number))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      btn.disabled = false;
      btnText.textContent = 'Search';
      if (data.error) { showError(data.error); return; }
      lastData = data;
      addToHistory(number);
      renderSummary(data);
      renderCategories(data);
      document.getElementById('actionBar').style.display = 'flex';
    })
    .catch(function(err) {
      btn.disabled = false;
      btnText.textContent = 'Search';
      showError('Network error: ' + err.message);
    });
}

function showError(msg) {
  var errorBox = document.getElementById('errorBox');
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

function escapeHtml(text) {
  var d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function renderSummary(data) {
  var box = document.getElementById('summaryBox');
  var items = [
    { icon: '&#128222;', label: 'Number', value: data['Number'] || '-' },
    { icon: '&#128100;', label: 'Owner', value: data['Owner Name'] || '-' },
    { icon: '&#128241;', label: 'SIM / Operator', value: data['SIM card'] || '-' }
  ];
  var html = '<div class="summary"><div class="summary-grid">';
  items.forEach(function(it) {
    html += '<div class="summary-item">' +
      '<div class="s-icon">' + it.icon + '</div>' +
      '<div class="s-label">' + it.label + '</div>' +
      '<div class="s-value">' + escapeHtml(it.value) + '</div>' +
    '</div>';
  });
  html += '</div></div>';
  box.innerHTML = html;
  box.style.display = 'block';
}

function renderCategories(data) {
  var box = document.getElementById('categoriesBox');
  var grouped = { personal: [], network: [], location: [], tracking: [] };

  Object.keys(data).forEach(function(key) {
    var meta = fieldMeta[key];
    if (meta) {
      grouped[meta.cat].push({ key: key, value: data[key], meta: meta });
    }
  });

  var html = '';
  ['personal', 'network', 'location', 'tracking'].forEach(function(catId) {
    var cat = categories[catId];
    var items = grouped[catId];
    if (items.length === 0) return;

    html += '<div class="category">';
    html += '<div class="cat-header">';
    html += '<div class="cat-icon" style="background:' + cat.color + '">' + cat.icon + '</div>';
    html += '<div><div class="cat-title">' + cat.title + '</div>';
    html += '<div class="cat-subtitle">' + cat.subtitle + '</div></div>';
    html += '</div>';
    html += '<div class="result-grid">';

    items.forEach(function(item) {
      html += '<div class="result-card" onclick="copyText(\'' + escapeHtml(String(item.value)).replace(/'/g, "\\'") + '\')">';
      html += '<div class="copy-hint">Click to copy</div>';
      html += '<div class="label">' + item.meta.icon + ' ' + escapeHtml(item.key) + '</div>';
      html += '<div class="hindi">' + escapeHtml(item.meta.hindi) + '</div>';
      html += '<div class="value">' + escapeHtml(String(item.value)) + '</div>';
      html += '</div>';
    });

    html += '</div></div>';
  });

  box.innerHTML = html;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatDataText() {
  if (!lastData) return '';
  var lines = ['=== Phone Tracker Report ===', ''];
  Object.keys(lastData).forEach(function(k) {
    var meta = fieldMeta[k];
    lines.push(k + ': ' + lastData[k]);
    if (meta) lines.push('  (' + meta.hindi + ')');
  });
  lines.push('', 'Generated: ' + new Date().toLocaleString());
  return lines.join('\n');
}

function shareWhatsApp() {
  if (!lastData) return;
  var text = formatDataText();
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function shareTelegram() {
  if (!lastData) return;
  var text = formatDataText();
  window.open('https://t.me/share/url?url=Phone+Tracker&text=' + encodeURIComponent(text), '_blank');
}

function copyAllData() {
  if (!lastData) return;
  navigator.clipboard.writeText(formatDataText());
  showToast('All data copied!');
}

function downloadPDF() {
  if (!lastData) return;
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor(99, 102, 241);
  doc.text('Phone Tracker Report', 105, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('Generated: ' + new Date().toLocaleString(), 105, 28, { align: 'center' });

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(20, 33, 190, 33);

  var catOrder = ['personal', 'network', 'location', 'tracking'];
  var rows = [];
  catOrder.forEach(function(catId) {
    var cat = categories[catId];
    rows.push([{ content: cat.title, colSpan: 3, styles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 11 } }]);
    Object.keys(lastData).forEach(function(k) {
      var meta = fieldMeta[k];
      if (meta && meta.cat === catId) {
        rows.push([k, String(lastData[k]), meta.hindi]);
      }
    });
  });

  doc.autoTable({
    startY: 38,
    head: [['Field', 'Details', 'Description (Hindi)']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    styles: { cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.25 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 60 }, 2: { cellWidth: 75, textColor: [99, 102, 241], fontSize: 8 } },
    margin: { left: 15, right: 15 }
  });

  var pageH = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Phone Tracker | @bmw_aura1', 105, pageH - 10, { align: 'center' });

  doc.save('phone-tracker-' + (lastData['Number'] || 'report') + '.pdf');
}

document.getElementById('phoneInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') searchNumber();
});

renderHistory();
</script>
</body>
</html>"""


def trace_number(phone_number):
    url = "https://calltracer.in"
    headers = {
        "Host": "calltracer.in",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {"country": "IN", "q": phone_number}

    try:
        response = requests.post(url, headers=headers, data=payload)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            details = {}
            try:
                details["Number"] = phone_number
                details["Complaints"] = soup.find(text="Complaints").find_next("td").text
                details["Owner Name"] = soup.find(text="Owner Name").find_next("td").text
                details["SIM card"] = soup.find(text="SIM card").find_next("td").text
                details["Mobile State"] = soup.find(text="Mobile State").find_next("td").text
                details["IMEI number"] = soup.find(text="IMEI number").find_next("td").text
                details["MAC address"] = soup.find(text="MAC address").find_next("td").text
                details["Connection"] = soup.find(text="Connection").find_next("td").text
                details["IP address"] = soup.find(text="IP address").find_next("td").text
                details["Owner Address"] = soup.find(text="Owner Address").find_next("td").text
                details["Hometown"] = soup.find(text="Hometown").find_next("td").text
                details["Reference City"] = soup.find(text="Refrence City").find_next("td").text
                details["Owner Personality"] = soup.find(text="Owner Personality").find_next("td").text
                details["Language"] = soup.find(text="Language").find_next("td").text
                details["Mobile Locations"] = soup.find(text="Mobile Locations").find_next("td").text
                details["Country"] = soup.find(text="Country").find_next("td").text
                details["Tracking History"] = soup.find(text="Tracking History").find_next("td").text
                details["Tracker Id"] = soup.find(text="Tracker Id").find_next("td").text
                details["Tower Locations"] = soup.find(text="Tower Locations").find_next("td").text
                return details
            except Exception:
                return {"error": "Unable to extract all details. Please check the response format."}
        else:
            return {"error": f"Failed to fetch data. HTTP Status Code: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}


@app.route("/", methods=["GET"])
def home():
    return render_template_string(HTML_TEMPLATE)


@app.route("/api", methods=["GET"])
def api():
    number = request.args.get("number")
    if not number:
        return jsonify({"error": "Please provide a phone number using ?number=..."})

    data = trace_number(number)
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
