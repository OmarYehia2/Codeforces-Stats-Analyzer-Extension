const API_BASE = "https://codeforces.com/api";

export function normalizeHandle(raw) {
  let h = (raw || "").trim();
  if (!h) return "";
  if (h.startsWith("<") && h.endsWith(">")) h = h.slice(1, -1).trim();
  return h;
}

export function parseDateMaybe(s) {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T00:00:00Z`);
    if (isNaN(d.getTime())) throw new Error("Date must be YYYY-MM-DD");
    return d;
  }
  const d = new Date(t);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return new Date(d.toISOString());
}

export function friendlyMD(epochSeconds) {
  const d = new Date(epochSeconds * 1000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

async function api(path, params) {
  const url = new URL(`${API_BASE}/${path}`);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (j.status !== "OK") throw new Error(j.comment || "Codeforces API error");
  return j.result;
}

export async function apiUserStatus(handle, fromIdx, count) {
  return api("user.status", { handle, from: String(fromIdx), count: String(count) });
}

export async function apiUserInfo(handle) {
  const res = await api("user.info", { handles: handle });
  return Array.isArray(res) && res[0] ? res[0] : null;
}

export async function fetchSubmissionsInPeriod({ handle, dtFrom, dtTo, pageSize = 300, maxRequests = 200, onProgress }) {
  if (dtFrom && dtTo && dtFrom.getTime() > dtTo.getTime()) {
    throw new Error("From date must be <= To date");
  }
  const fromTs = dtFrom ? Math.floor(dtFrom.getTime() / 1000) : null;
  const toTs = dtTo ? Math.floor(dtTo.getTime() / 1000) : null;

  let startIdx = 1;
  let requestsMade = 0;
  const yielded = [];

  while (true) {
    if (requestsMade >= maxRequests) {
      onProgress?.(`Reached max_requests=${maxRequests}; stopping.`);
      break;
    }
    requestsMade++;
    onProgress?.(`API request #${requestsMade}: from=${startIdx} count=${pageSize}`);
    const page = await apiUserStatus(handle, startIdx, pageSize);
    if (!page || page.length === 0) {
      onProgress?.("No more submissions returned by API.");
      break;
    }

    let oldestTsInPage = null;
    for (const s of page) {
      const ts = Number(s.creationTimeSeconds || 0);
      if (oldestTsInPage === null || ts < oldestTsInPage) oldestTsInPage = ts;
      if (fromTs !== null && ts < fromTs) continue;
      if (toTs !== null && ts > toTs) continue;
      yielded.push(s);
    }

    if (oldestTsInPage !== null && fromTs !== null && oldestTsInPage < fromTs) {
      onProgress?.("Oldest submission in page is older than From date -> stopping early.");
      break;
    }
    startIdx += page.length;
  }
  onProgress?.(`Finished fetching. Yielded ${yielded.length} submissions in period.`);
  return yielded;
}

export function collectFirstACPerProblem(subs) {
  const solved = new Map();
  for (const s of subs) {
    if (s.verdict !== "OK") continue;
    const p = s.problem || {};
    const ts = Number(s.creationTimeSeconds || 0);
    let key;
    if (p.contestId != null && p.index) key = `${p.contestId}-${p.index}`;
    else key = `nopid-${p.name || "unknown"}`;
    const tags = p.tags || [];
    const name = p.name || "";
    const rating = p.rating;
    if (!solved.has(key) || ts < solved.get(key)[0]) {
      solved.set(key, [ts, tags, name, rating]);
    }
  }
  return solved;
}


