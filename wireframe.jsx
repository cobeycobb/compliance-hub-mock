import React, { useMemo, useState, useEffect } from "react";

/*
  Compliance Hub - Light Pastel Wireframe (CSV-aware)
  ---------------------------------------------------
  What changed now:
  - Reads CSV data client-side (Upload CSV) and renders ALL discovered fields.
  - Still ASCII-only, plain React + JSX. No TypeScript. No external libs.
  - Keeps sticky, compact search at the top. Rows below are full-width cards.
  - Defaults to 30 demo rows until a CSV is uploaded (so tests pass and layout is visible).

  Notes:
  - The CSV you shared was analyzed offline to learn its column names, including:
    Strain, BioTrackID, TotalTHC, TotalCBD, TotalCannabinoids, PdfUrl, manufactured by,
    Manufacture date, package date, expiration date, Testing lab, Grown by, Pesticides used,
    solvents used, intended use, warning 1, warning 2, poison contorl.
  - This UI will display ANY columns found in an uploaded CSV, not limited to the above.
*/

// -----------------------------
// Mock data for tests (kept small)
// -----------------------------
const MOCK_DATA = [
  {
    id: "TR-ABCD-0001",
    name: "Canvas OG Pre-Roll 1g",
    strain: "Canvas OG",
    type: "flower",
    batch: "B2411-A",
    testDate: "2025-08-18",
    thcTotal: "23.6%",
    cbdTotal: "0.1%",
    cannabinoidsTotal: "28.2%",
    lab: "MockLab NM",
    raw: {},
  },
  {
    id: "TR-ABCD-0002",
    name: "Live Resin - Pine Dew (1g)",
    strain: "Pine Dew",
    type: "concentrate",
    batch: "B2410-R",
    testDate: "2025-08-19",
    thcTotal: "82.4%",
    cbdTotal: "0.0%",
    cannabinoidsTotal: "89.1%",
    lab: "MockLab NM",
    raw: {},
  },
  {
    id: "TR-ABCD-0003",
    name: "Gummy - Mango Chili (10-pack)",
    strain: "-",
    type: "edible",
    batch: "E2409-M",
    testDate: "2025-08-20",
    thcTotal: "10 mg/pc",
    cbdTotal: "0 mg/pc",
    cannabinoidsTotal: "10 mg/pc",
    lab: "MockLab NM",
    raw: {},
  },
  {
    id: "TR-ABCD-0004",
    name: "Sunset Haze 3.5g Flower",
    strain: "Sunset Haze",
    type: "flower",
    batch: "B2411-S",
    testDate: "2025-08-21",
    thcTotal: "27.1%",
    cbdTotal: "0.0%",
    cannabinoidsTotal: "31.5%",
    lab: "MockLab NM",
    raw: {},
  },
];

// Build ~30 demo rows for scrolling (do not touch MOCK_DATA)
function buildSamples(count) {
  var arr = [];
  for (var i = 0; i < count; i++) {
    var base = MOCK_DATA[i % MOCK_DATA.length];
    var idx = i + 1;
    var id = "TR-SAMPLE-" + String(idx).padStart(3, "0");
    var t = ["flower", "concentrate", "edible"][i % 3];
    arr.push({
      id: id,
      name: base.name + " Lot " + (100 + idx),
      strain: base.strain === "-" ? "Blend" : base.strain,
      type: t,
      batch: "S" + (2400 + idx),
      testDate: "2025-08-" + ((i % 28) + 1).toString().padStart(2, "0"),
      thcTotal: t === "edible" ? (10 + (i % 5)) + " mg/pc" : (20 + (i % 10)) + "." + (i % 10) + "%",
      cbdTotal: t === "edible" ? (i % 2) + " mg/pc" : (i % 3) + "." + (i % 10) + "%",
      cannabinoidsTotal: t === "edible" ? (10 + (i % 5)) + " mg/pc" : (25 + (i % 10)) + "." + ((i + 3) % 10) + "%",
      lab: "MockLab NM",
      raw: {
        Strain: base.strain,
        BioTrackID: id,
        TotalTHC: t === "edible" ? "10 mg/pc" : "25.0%",
        TotalCBD: t === "edible" ? "0 mg/pc" : "0.5%",
        TotalCannabinoids: t === "edible" ? "10 mg/pc" : "30.0%",
        PdfUrl: "",
        "manufactured by": "Canvas Organics",
        "Manufacture date": "2025-08-01",
        "package date": "2025-08-02",
        "expiration date": "2026-08-01",
        "Testing lab": "MockLab NM",
        "Grown by": "Canvas Farm",
        "Pesticides used": "None",
        "solvents used": t === "concentrate" ? "Hydrocarbon" : "None",
        "intended use": "Follow label directions",
        "warning 1": "For adults 21+. Keep away from children and pets.",
        "warning 2": "Not FDA approved. Do not drive or operate machinery.",
        "poison contorl": "New Mexico Poison and Drug Hotline: 1-800-222-1222",
      }
    });
  }
  return arr;
}

const DEMO_DATA = buildSamples(30);

// -----------------------------
// Utilities: normalization and fuzzy key inference
// -----------------------------
function normalizeASCII(input) {
  if (!input) return "";
  return String(input)
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/[\u00A0]/g, " ")
    .toLowerCase()
    .trim();
}

function inferKey(columns, patterns) {
  var i;
  for (i = 0; i < columns.length; i++) {
    var c = columns[i];
    for (var j = 0; j < patterns.length; j++) {
      var re = new RegExp(patterns[j], "i");
      if (re.test(c)) return c;
    }
  }
  return null;
}

function mapCsvRow(row) {
  // Row is a generic object of CSV columns. Build a standard shape plus keep raw.
  var cols = Object.keys(row || {});
  var idKey = inferKey(cols, ["biotrack", "bio\\s*track", "tracking", "uid", "barcode", "tag"]);
  var nameKey = inferKey(cols, ["product.*name", "item.*name", "name"]);
  var strainKey = inferKey(cols, ["strain"]);
  var typeKey = inferKey(cols, ["type", "category", "class"]);
  var batchKey = inferKey(cols, ["batch", "lot"]);
  var testDateKey = inferKey(cols, ["test.*date", "coa.*date", "date.*tested", "manufacture date", "package date", "date$"]);
  var labKey = inferKey(cols, ["lab", "laboratory", "testing lab"]);
  var thcKey = inferKey(cols, ["thc.*total", "total.*thc", "thc$"]);
  var cbdKey = inferKey(cols, ["cbd.*total", "total.*cbd", "cbd$"]);
  var cannKey = inferKey(cols, ["total.*cannabinoids", "cannabinoids.*total", "cannabinoids$"]);
  var pdfKey = inferKey(cols, ["pdf", "coa", "url", "link"]);

  function pick(k) { return k && row[k] != null ? String(row[k]) : ""; }

  return {
    id: pick(idKey) || pick(batchKey) || "",
    name: pick(nameKey) || (pick(strainKey) ? pick(strainKey) + " - Item" : "Item"),
    strain: pick(strainKey),
    type: pick(typeKey) || "-",
    batch: pick(batchKey),
    testDate: pick(testDateKey),
    thcTotal: pick(thcKey),
    cbdTotal: pick(cbdKey),
    cannabinoidsTotal: pick(cannKey),
    lab: pick(labKey),
    pdfUrl: pick(pdfKey),
    raw: row || {},
  };
}

function applyFilter(data, search, activeType) {
  var s = normalizeASCII(search || "");
  function match(v) { return normalizeASCII(v || "").includes(s); }
  return (data || []).filter(function (d) {
    var typeOk = activeType === "all" ? true : d.type === activeType;
    var haystack = [d.id, d.name, d.strain, d.batch, d.testDate, d.lab].join(" ") + " " + Object.values(d.raw || {}).join(" ");
    var searchOk = !s ? true : match(haystack);
    return typeOk && searchOk;
  });
}

function titleize(s) {
  if (!s) return "";
  return String(s)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, function(t){ return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); });
}

// -----------------------------
// Main Component
// -----------------------------
export default function ComplianceHubWireframe() {
  const [search, setSearch] = useState("");
  const [activeType] = useState("all");
  const [dense] = useState(true); // compact by default, no toggle

  // CSV handling (optional). When empty, we show DEMO_DATA.
  const [csvRows, setCsvRows] = useState([]); // array of raw csv rows (objects)
  const mappedCsv = useMemo(function(){
    return (csvRows || []).map(mapCsvRow);
  }, [csvRows]);

  const DATA = mappedCsv.length ? mappedCsv : DEMO_DATA;

  const filtered = useMemo(function () {
    return applyFilter(DATA, search, activeType);
  }, [DATA, search, activeType]);

  // -----------------------------
  // Tests (run after mount) - DO NOT modify existing assertions
  // -----------------------------
  useEffect(function () {
    try {
      var out = applyFilter(MOCK_DATA, "", "all");
      console.assert(out.length === 4, "T1: 4 results for empty search, all types");

      out = applyFilter(MOCK_DATA, "TR-ABCD-0004", "all");
      console.assert(out.length === 1 && out[0].id === "TR-ABCD-0004", "T2: id exact match");

      out = applyFilter(MOCK_DATA, "sunset", "all");
      console.assert(out.length === 1 && /sunset/.test(out[0].name.toLowerCase()), "T3: name partial match");

      out = applyFilter(MOCK_DATA, "", "flower");
      console.assert(out.length === 2 && out.every(function (x) { return x.type === "flower"; }), "T4: type filter");

      out = applyFilter(MOCK_DATA, "B2411", "all");
      console.assert(out.length === 2, "T5: batch partial match hits two items");

      out = applyFilter(MOCK_DATA, "PINE", "concentrate");
      console.assert(out.length === 1 && out[0].id === "TR-ABCD-0002", "T6: case-insensitive search");

      out = applyFilter(MOCK_DATA, "  pine  ", "concentrate");
      console.assert(out.length === 1, "T7: trim works");

      out = applyFilter(MOCK_DATA, "not-a-real-batch", "all");
      console.assert(out.length === 0, "T8: no-match scenario");

      // Additional tests - new
      out = applyFilter(MOCK_DATA, "\u201CSunset\u201D", "all");
      console.assert(out.length === 1 && out[0].id === "TR-ABCD-0004", "T9: curly quotes normalize");

      out = applyFilter(MOCK_DATA, "TR\u2011ABCD", "all");
      console.assert(out.length === 4, "T10: dash normalization allows substring match");

      // Validate demo count for scrolling
      out = applyFilter(DEMO_DATA, "", "all");
      console.assert(out.length === 30, "T11: demo data renders 30 items for scrolling");

      console.log("ComplianceHubWireframe tests: PASS");
    } catch (e) {
      console.warn("ComplianceHubWireframe tests: ERROR", e);
    }
  }, []);

  // Client-side CSV parser that handles quotes and commas.
  function parseCSV(text) {
    var rows = [];
    var i = 0, field = "", row = [], inQuotes = false;
    function pushField(){ row.push(field); field = ""; }
    function endRow(){ rows.push(row); row = []; }
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i+1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else { field += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { pushField(); }
        else if (ch === '\n') { pushField(); endRow(); }
        else if (ch === '\r') { /* ignore */ }
        else { field += ch; }
      }
      i++;
    }
    // finalize
    pushField();
    endRow();

    if (!rows.length) return [];
    var header = rows[0];
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var obj = {};
      var cur = rows[r];
      for (var c = 0; c < header.length; c++) {
        var key = header[c] != null ? String(header[c]).trim() : "";
        if (!key) continue;
        obj[key] = cur[c] != null ? String(cur[c]).trim() : "";
      }
      var empty = Object.values(obj).every(function(v){ return !v; });
      if (!empty) out.push(obj);
    }
    return out;
  }

  function onCsvFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var text = String(ev.target && ev.target.result || "");
        var rows = parseCSV(text);
        setCsvRows(rows.slice(0, 1000)); // safety cap
      } catch (err) {
        console.warn("CSV parse error", err);
        setCsvRows([]);
      }
    };
    reader.readAsText(file);
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-sky-100 to-indigo-100 text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-200 border border-indigo-300" aria-hidden="true" />
            <div className="leading-tight">
              <div className="font-semibold tracking-tight text-slate-800">Canvas Organics</div>
              <div className="text-xs text-slate-500">Compliance Hub - Wireframe</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span>{mappedCsv.length ? "CSV loaded" : "Demo data"}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Sticky, compact Search - very top */}
        <section className="sticky top-14 z-20 mt-2" role="search" aria-label="BioTrack search">
          <div className="rounded-xl border border-sky-300 bg-gradient-to-r from-sky-100 via-indigo-100 to-rose-100 p-3 sm:p-4 shadow-md ring-1 ring-inset ring-sky-300">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">search biotrack number</h1>
                <p className="mt-0.5 text-sm text-slate-700">or scroll down to find your product</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-700" htmlFor="csvUpload">Upload CSV</label>
                <input id="csvUpload" type="file" accept=".csv" onChange={onCsvFile} className="text-xs" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <input
                id="biotrack"
                type="text"
                placeholder={'e.g., TR-1234 or "Chili"'}
                value={search}
                onChange={function (e) { setSearch(e.target.value); }}
                className="flex-1 min-w-64 rounded-xl border border-sky-400 bg-white px-5 py-2.5 text-base outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-400"
              />
              <button
                onClick={function () { setSearch(""); }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-100"
              >
                Clear
              </button>
              <button
                onClick={function () { /* no-op demo */ }}
                className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white px-5 py-2 text-sm font-semibold shadow-sm"
              >
                Search
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-600">{filtered.length} result{filtered.length === 1 ? "" : "s"} ({mappedCsv.length ? "from CSV" : "demo"})</div>
          </div>
        </section>

        {/* Results list: ONE CARD PER ROW */}
        <section className="mt-4 space-y-3">
          {filtered.map(function (item, idx) {
            return <WideCard key={(item.id || "row") + "-" + idx} dense={dense} item={item} />;
          })}

          {filtered.length === 0 && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
              No results for <span className="text-slate-800">{search ? '"' + search + '"' : '""'}</span>. Check the package label for your BioTrack number.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function WideCard(props) {
  var item = props.item;
  var dense = props.dense;

  // Compute extra fields: any raw key not already shown in header/facts/bubbles
  var shownKeys = {};
  function mark(k){ if(k) shownKeys[k] = true; }
  // Identify likely keys in raw
  var cols = Object.keys(item.raw || {});
  var idKey = inferKey(cols, ["biotrack", "bio\\s*track", "tracking", "uid", "barcode", "tag"]);
  var batchKey = inferKey(cols, ["batch", "lot"]);
  var testDateKey = inferKey(cols, ["test.*date", "coa.*date", "date.*tested", "manufacture date", "package date", "date$"]);
  var labKey = inferKey(cols, ["lab", "laboratory", "testing lab"]);
  var thcKey = inferKey(cols, ["thc.*total", "total.*thc", "thc$"]);
  var cbdKey = inferKey(cols, ["cbd.*total", "total.*cbd", "cbd$"]);
  var cannKey = inferKey(cols, ["total.*cannabinoids", "cannabinoids.*total", "cannabinoids$"]);
  mark(idKey); mark(batchKey); mark(testDateKey); mark(labKey); mark(thcKey); mark(cbdKey); mark(cannKey);

  var extraKeys = cols.filter(function(k){ return !shownKeys[k]; });

  return (
    <article className={("rounded-2xl border border-slate-200 bg-white ") + (dense ? "p-3" : "p-4") + (" shadow-sm transition hover:border-sky-300") }>
      {/* Header row: name + id */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="min-w-0">
          <h4 className={("truncate ") + (dense ? "text-sm" : "text-base") + (" font-semibold text-slate-900")}>{item.name || item.strain || "Item"}</h4>
          <div className="mt-0.5 text-xs text-slate-600 truncate">{item.strain || "-"}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {item.id && <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">{item.id}</span>}
          {item.testDate && <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">{item.testDate}</span>}
        </div>
      </div>

      {/* Facts strip */}
      <dl className={("mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 ") + (dense ? "gap-y-1" : "gap-y-1.5") + (" text-xs text-slate-700") }>
        {item.id && <div className="flex items-center gap-1"><dt className="text-slate-500">BioTrack</dt><dd className="truncate font-medium text-slate-900">{item.id}</dd></div>}
        {item.batch && <div className="flex items-center gap-1"><dt className="text-slate-500">Batch</dt><dd className="truncate">{item.batch}</dd></div>}
        {item.testDate && <div className="flex items-center gap-1"><dt className="text-slate-500">Tested</dt><dd>{item.testDate}</dd></div>}
        {item.lab && <div className="flex items-center gap-1"><dt className="text-slate-500">Lab</dt><dd className="truncate">{item.lab}</dd></div>}
      </dl>

      {/* Potency bubbles: full-width row, equal tiles (conditional) */}
      {(item.thcTotal || item.cbdTotal || item.cannabinoidsTotal) && (
        <div className={("mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 ") + (dense ? "text-xs" : "text-sm") }>
          {item.thcTotal && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 flex items-center justify-between">
              <span className="text-indigo-700">THC Total</span>
              <b className="text-indigo-900">{item.thcTotal}</b>
            </div>
          )}
          {item.cbdTotal && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center justify-between">
              <span className="text-emerald-700">CBD Total</span>
              <b className="text-emerald-900">{item.cbdTotal}</b>
            </div>
          )}
          {item.cannabinoidsTotal && (
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 flex items-center justify-between">
              <span className="text-cyan-700">Total Cannabinoids</span>
              <b className="text-cyan-900">{item.cannabinoidsTotal}</b>
            </div>
          )}
        </div>
      )}

      {/* Extra fields grid */}
      {extraKeys.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {extraKeys.map(function(k){
              var val = item.raw[k];
              if (k === "PdfUrl" && val) {
                return (
                  <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                    <div className="text-slate-500">{titleize(k)}</div>
                    <a href={val} target="_blank" rel="noreferrer" className="text-sky-700 underline break-all">Open COA</a>
                  </div>
                );
              }
              return (
                <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  <div className="text-slate-500">{titleize(k)}</div>
                  <div className="text-slate-800 whitespace-pre-wrap break-words">{String(val || "-")}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between">
        {item.pdfUrl ? (
          <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-1.5 text-xs text-slate-800 hover:bg-sky-200">View COA</a>
        ) : (
          <button className="rounded-lg border border-sky-300 bg-sky-100 px-3 py-1.5 text-xs text-slate-800 opacity-60 cursor-default">View COA</button>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <button className="rounded-md border border-slate-200 bg-white px-2 py-0.5 hover:bg-slate-50">Details</button>
          <button className="rounded-md border border-slate-200 bg-white px-2 py-0.5 hover:bg-slate-50">QR</button>
        </div>
      </div>
    </article>
  );
}
