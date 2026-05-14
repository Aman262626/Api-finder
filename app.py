from flask import Flask, request, jsonify, render_template_string
from bs4 import BeautifulSoup
import requests

app = Flask(__name__)

HTML_TEMPLATE = """<!DOCTYPE html>
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
.container{position:relative;z-index:1;max-width:800px;margin:0 auto;padding:20px}

/* Header */
header{text-align:center;padding:40px 0 30px}
.logo{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#6366f1,#a855f7);font-size:28px;font-weight:800;margin-bottom:16px;box-shadow:0 8px 32px rgba(99,102,241,.3)}
header h1{font-size:32px;font-weight:800;background:linear-gradient(135deg,#818cf8,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px}
header p{color:#64748b;font-size:14px}

/* Search */
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
.btn-pdf{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#4ade80;margin-top:20px}
.btn-pdf:hover{background:rgba(34,197,94,.2)}

/* Loading */
.spinner{display:inline-block;width:20px;height:20px;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Error */
.error-box{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:14px;padding:16px;color:#f87171;margin-bottom:20px;font-size:14px}

/* Results */
.results{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;backdrop-filter:blur(12px);animation:fadeUp .4s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.results h2{font-size:20px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:10px}
.results h2 .badge{font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.2)}
.result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:600px){.result-grid{grid-template-columns:1fr}}
.result-card{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:16px;transition:.2s}
.result-card:hover{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.04)}
.result-card .label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:4px;font-weight:600}
.result-card .value{font-size:15px;color:#e2e8f0;font-weight:500;word-break:break-word}
.result-card.highlight{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.06)}
.result-card.highlight .value{color:#818cf8;font-weight:700;font-size:18px}

/* Footer */
footer{text-align:center;padding:40px 0 20px;color:#334155;font-size:13px}
footer a{color:#6366f1;text-decoration:none}
footer a:hover{text-decoration:underline}

/* Telegram */
.tg-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);color:#60a5fa;border-radius:12px;text-decoration:none;font-size:13px;font-weight:600;margin-top:10px;transition:.2s}
.tg-btn:hover{background:rgba(59,130,246,.2)}
.tg-btn svg{width:16px;height:16px;fill:currentColor}
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

  <!-- Search -->
  <div class="search-box">
    <h2><span class="icon">&#128270;</span> Search Number</h2>
    <div class="input-row">
      <input type="tel" id="phoneInput" placeholder="Enter phone number (e.g. 9876543210)" maxlength="15" autocomplete="off">
      <button class="btn btn-primary" id="searchBtn" onclick="searchNumber()">
        <span id="btnText">Search</span>
      </button>
    </div>
  </div>

  <!-- Error -->
  <div id="errorBox" class="error-box" style="display:none"></div>

  <!-- Results -->
  <div id="resultsBox" style="display:none">
    <div class="results">
      <h2>
        Results
        <span class="badge" id="numberBadge"></span>
      </h2>
      <div class="result-grid" id="resultGrid"></div>
      <div style="text-align:center">
        <button class="btn btn-pdf" onclick="downloadPDF()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
          Download PDF Report
        </button>
      </div>
    </div>
  </div>

  <footer>
    <a href="https://t.me/bmw_aura1" class="tg-btn" target="_blank">
      <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-1.98 9.33c-.15.67-.54.83-1.1.52l-3.03-2.23-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.06 5.57-5.03c.24-.22-.05-.34-.38-.13l-6.88 4.34-2.96-.93c-.64-.2-.66-.64.14-.95l11.58-4.46c.54-.2 1.01.13.83.95l.06-.06z"/></svg>
      Telegram Bot
    </a>
    <p style="margin-top:12px">Owner: @bmw_aura1</p>
  </footer>
</div>

<script>
let lastData = null;

function searchNumber() {
  const input = document.getElementById('phoneInput');
  const btn = document.getElementById('searchBtn');
  const btnText = document.getElementById('btnText');
  const errorBox = document.getElementById('errorBox');
  const resultsBox = document.getElementById('resultsBox');
  const number = input.value.trim();

  if (!number) {
    showError('Phone number enter karo!');
    return;
  }

  errorBox.style.display = 'none';
  resultsBox.style.display = 'none';
  btn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span>';

  fetch('/api?number=' + encodeURIComponent(number))
    .then(r => r.json())
    .then(data => {
      btn.disabled = false;
      btnText.textContent = 'Search';

      if (data.error) {
        showError(data.error);
        return;
      }

      lastData = data;
      renderResults(data);
    })
    .catch(err => {
      btn.disabled = false;
      btnText.textContent = 'Search';
      showError('Network error: ' + err.message);
    });
}

function showError(msg) {
  const errorBox = document.getElementById('errorBox');
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

function renderResults(data) {
  const grid = document.getElementById('resultGrid');
  const badge = document.getElementById('numberBadge');
  const resultsBox = document.getElementById('resultsBox');

  badge.textContent = data['Number'] || '';
  grid.innerHTML = '';

  const highlightKeys = ['Number', 'Owner Name', 'SIM card'];
  const iconMap = {
    'Number': '&#128222;',
    'Owner Name': '&#128100;',
    'SIM card': '&#128241;',
    'Mobile State': '&#127970;',
    'IMEI number': '&#128272;',
    'MAC address': '&#128421;',
    'Connection': '&#128279;',
    'IP address': '&#127760;',
    'Owner Address': '&#127968;',
    'Hometown': '&#127969;',
    'Reference City': '&#127751;',
    'Owner Personality': '&#128161;',
    'Language': '&#127463;',
    'Mobile Locations': '&#128205;',
    'Country': '&#127758;',
    'Tracking History': '&#128200;',
    'Tracker Id': '&#128196;',
    'Tower Locations': '&#128225;',
    'Complaints': '&#9888;'
  };

  for (const [key, val] of Object.entries(data)) {
    const card = document.createElement('div');
    const isHighlight = highlightKeys.includes(key);
    card.className = 'result-card' + (isHighlight ? ' highlight' : '');
    const icon = iconMap[key] || '&#128203;';
    card.innerHTML =
      '<div class="label">' + icon + ' ' + escapeHtml(key) + '</div>' +
      '<div class="value">' + escapeHtml(String(val)) + '</div>';
    grid.appendChild(card);
  }

  resultsBox.style.display = 'block';
  resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function downloadPDF() {
  if (!lastData) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Title
  doc.setFontSize(22);
  doc.setTextColor(99, 102, 241);
  doc.text('Phone Tracker Report', 105, 20, { align: 'center' });

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('Generated on ' + new Date().toLocaleString(), 105, 28, { align: 'center' });

  // Line
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(20, 33, 190, 33);

  // Table
  const rows = Object.entries(lastData).map(([k, v]) => [k, String(v)]);
  doc.autoTable({
    startY: 38,
    head: [['Field', 'Details']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 11
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249]
    },
    styles: {
      cellPadding: 5,
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    margin: { left: 20, right: 20 }
  });

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Phone Tracker | @bmw_aura1', 105, pageH - 10, { align: 'center' });

  doc.save('phone-tracker-' + (lastData['Number'] || 'report') + '.pdf');
}

// Enter key to search
document.getElementById('phoneInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') searchNumber();
});
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
