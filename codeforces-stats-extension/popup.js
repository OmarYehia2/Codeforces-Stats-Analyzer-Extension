import {
  normalizeHandle,
  parseDateMaybe,
  friendlyMD,
  fetchSubmissionsInPeriod,
  collectFirstACPerProblem,
  apiUserInfo
} from "./src/cf_api.js";
import { setStatus, setLast30, downloadCsv } from "./src/utils.js";

const $ = sel => document.querySelector(sel);

const els = {
  handle: $("#handle"),
  usePage: $("#usePage"),
  useDefault: $("#useDefault"),
  from: $("#from"),
  to: $("#to"),
  last30: $("#last30"),
  fetch: $("#fetch"),
  clear: $("#clear"),
  saveCsv: $("#saveCsv"),
  status: $("#status"),
  tags: $("#tags"),
  solved: $("#solved"),
  stats: $("#stats")
};

function renderTags(tagCounts, tagRatings) {
  const entries = Object.entries(tagCounts).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
  if (entries.length === 0) {
    els.tags.innerHTML = "<div class='badge'>none</div>";
    return;
  }
  const rows = entries.map(([tag, cnt]) => {
    const r = tagRatings[tag] || [];
    if (r.length) {
      const min = Math.floor(Math.min(...r));
      const max = Math.floor(Math.max(...r));
      const avg = Math.round((r.reduce((a,c)=>a+c,0)/r.length)*10)/10;
      return `<tr><td>${tag}</td><td><span class="badge">${cnt}</span></td><td>${min}</td><td>${max}</td><td>${avg}</td></tr>`;
    } else {
      return `<tr><td>${tag}</td><td><span class="badge">${cnt}</span></td><td>N/A</td><td>N/A</td><td>N/A</td></tr>`;
    }
  }).join("");
  els.tags.innerHTML = `
    <table class="table">
      <thead><tr><th>Tag</th><th>Count</th><th>Min</th><th>Max</th><th>Avg</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSolvedAndStats(solvedMap, allRatings, dtFrom, dtTo, userInfo) {
  const arr = Array.from(solvedMap.entries()).sort((a,b)=>b[1][0]-a[1][0]);
  const lines = arr.map(([key, [ts, tags, name, rating]]) => {
    const md = friendlyMD(ts);
    return `${key} | ${md} | ${name} | tags: ${tags.join(",")}`;
  }).join("\n");
  els.solved.textContent = lines || "(none)";

  const days = Math.max(1, (dtTo - dtFrom) / 86400000);
  const problemsCount = solvedMap.size;
  const solveRate = problemsCount / days;
  const stats = [
    `Period: ${dtFrom.toISOString().slice(0,10)} → ${dtTo.toISOString().slice(0,10)} (${days.toFixed(2)} days)`,
    `Problems (unique OK in period): ${problemsCount}`,
    `Solve rate: ${solveRate.toFixed(3)} problems/day`
  ];
  if (allRatings.length) {
    const avg = Math.round((allRatings.reduce((a,c)=>a+c,0)/allRatings.length)*10)/10;
    const mn = Math.floor(Math.min(...allRatings));
    const mx = Math.floor(Math.max(...allRatings));
    stats.push(`Average problem rating: ${avg} (min ${mn}, max ${mx})`);
  } else {
    stats.push("Average problem rating: N/A (no rating fields)");
  }
  if (userInfo?.rating != null) stats.push(`Current rating: ${userInfo.rating}`);
  if (userInfo?.maxRating != null) stats.push(`Max rating: ${userInfo.maxRating}`);

  els.stats.innerHTML = stats.map(s => `<div>${s}</div>`).join("");
}

function clearOutput() {
  els.tags.innerHTML = "";
  els.solved.textContent = "";
  els.stats.textContent = "";
  els.saveCsv.disabled = true;
}

async function loadDefaultHandle() {
  return new Promise(resolve => chrome.storage.sync.get(["defaultHandle"], v => resolve(v.defaultHandle || "")));
}

async function saveCsvFromSolved(solvedMap) {
  const rows = [["key","first_ac_mmdd","name","rating","tags"]];
  const arr = Array.from(solvedMap.entries()).sort((a,b)=>b[1][0]-a[1][0]);
  for (const [key, [ts, tags, name, rating]] of arr) {
    rows.push([key, friendlyMD(ts), name, rating ?? "", tags.join(";")]);
  }
  downloadCsv("solved_problems.csv", rows);
}

function ensureToEndOfDay(dtTo, toStr) {
  if (toStr && /^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
    const d = new Date(`${toStr}T23:59:59Z`);
    return d;
  }
  return dtTo;
}

let lastSolvedMap = new Map();

async function onFetch() {
  try {
    els.fetch.disabled = true;
    els.saveCsv.disabled = true;
    clearOutput();

    const rawHandle = els.handle.value;
    const handle = normalizeHandle(rawHandle);
    if (!handle) throw new Error("Please enter a Codeforces handle.");

    let dtFrom = parseDateMaybe(els.from.value);
    let dtTo = parseDateMaybe(els.to.value);
    if (!dtTo) dtTo = new Date();
    if (!dtFrom) dtFrom = new Date(Date.now() - 30*86400*1000);
    dtTo = ensureToEndOfDay(dtTo, els.to.value);

    setStatus(els.status, `Fetching for ${handle} from ${dtFrom.toISOString().slice(0,10)} to ${dtTo.toISOString().slice(0,10)} ...`);

    const subs = await fetchSubmissionsInPeriod({
      handle, dtFrom, dtTo, pageSize: 300, maxRequests: 200,
      onProgress: (msg) => setStatus(els.status, msg)
    });
    const solvedMap = collectFirstACPerProblem(subs);

    const tagCounts = {};
    const tagRatings = {};
    const allRatings = [];
    for (const [_, [ts, tags, name, rating]] of solvedMap) {
      let rv = null;
      if (rating != null && !isNaN(Number(rating))) {
        rv = Number(rating);
        allRatings.push(rv);
      }
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        if (rv != null) {
          (tagRatings[tag] ||= []).push(rv);
        }
      }
    }

    let userInfo = null;
    try { userInfo = await apiUserInfo(handle); } catch { /* ignore */ }

    renderTags(tagCounts, tagRatings);
    renderSolvedAndStats(solvedMap, allRatings, dtFrom, dtTo, userInfo);

    lastSolvedMap = solvedMap;
    setStatus(els.status, `Done. Unique OK problems in period: ${solvedMap.size}`);
    if (solvedMap.size) els.saveCsv.disabled = false;
  } catch (e) {
    setStatus(els.status, `Error: ${e.message || e}`);
    alert(`Failed to fetch data:\n${e.message || e}`);
  } finally {
    els.fetch.disabled = false;
  }
}

function init() {
  setLast30(els.from, els.to);
  els.last30.addEventListener("click", () => setLast30(els.from, els.to));
  els.fetch.addEventListener("click", onFetch);
  els.clear.addEventListener("click", () => { clearOutput(); setStatus(els.status, "Ready."); });
  els.saveCsv.addEventListener("click", () => saveCsvFromSolved(lastSolvedMap));
  els.handle.addEventListener("keydown", (e) => { if (e.key === "Enter") onFetch(); });
  els.usePage.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) return;
      const u = new URL(tab.url);
      if (u.hostname !== "codeforces.com") return;
      // Match profile URLs like /profile/<handle>
      const m = u.pathname.match(/^\/profile\/([^\/?#]+)/);
      if (m && m[1]) {
        els.handle.value = m[1];
        setStatus(els.status, `Detected handle from page: ${m[1]}`);
      } else {
        setStatus(els.status, "Not on a Codeforces profile page.");
      }
    } catch (e) {
      setStatus(els.status, `Error reading active tab: ${e.message || e}`);
    }
  });
  els.useDefault.addEventListener("click", async () => {
    const def = await loadDefaultHandle();
    if (def) els.handle.value = def;
  });
  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(["defaultHandle"], v => { if (v.defaultHandle) els.handle.value = v.defaultHandle; });
  }
}

document.addEventListener("DOMContentLoaded", init);


