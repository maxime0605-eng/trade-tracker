export const COLORS = {
  ct: '#378ADD',
  world: '#378ADD',
  nasdaq: '#7F77DD',
  europe: '#1D9E75',
  em: '#D85A30',
  crypto: '#E9A827',
  btc: '#E9A827',
};

export const ASSET_LABELS = {
  world: 'MSCI World',
  nasdaq: 'Nasdaq-100',
  europe: 'MSCI Europe',
  em: 'MSCI EM',
  btc: 'Bitcoin',
  ct: 'Compte-Titres',
  crypto: 'Crypto',
  total: 'CT Total',
};

export const TARGET_MONTHLY = { world: 160, nasdaq: 45, europe: 35, em: 10, ct: 250, btc: 50, crypto: 50 };
export const TARGET_ALLOC = { world: 160 / 250, nasdaq: 45 / 250, europe: 35 / 250, em: 10 / 250 };

const fmtEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtCurrency(v) {
  if (v == null || isNaN(v)) return '—';
  return fmtEUR.format(v);
}

export function fmtCurrencyCompact(v) {
  if (v == null || isNaN(v)) return '—';
  if (Math.abs(v) >= 1000) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 1, notation: 'compact' }).format(v);
  }
  return fmtEUR.format(v);
}

export function fmtPct(v, withSign = true) {
  if (v == null || isNaN(v)) return '—';
  const s = withSign && v > 0 ? '+' : '';
  return `${s}${v.toFixed(2)} %`;
}

export function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function calcCAGR(invested, value, firstDate) {
  if (!invested || !value || !firstDate || invested <= 0) return null;
  const years = (Date.now() - new Date(firstDate + 'T00:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 0.083) return null; // < 1 month
  const cagr = (Math.pow(value / invested, 1 / years) - 1) * 100;
  return isFinite(cagr) ? cagr : null;
}

export function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / (24 * 60 * 60 * 1000);
}

export function getLastEntryDate(entries) {
  if (!entries.length) return null;
  return entries.reduce((max, e) => (e.date > max ? e.date : max), '0000-00-00');
}

// Cumulative invested per asset from entries
export function investedPerAsset(entries) {
  const r = { world: 0, nasdaq: 0, europe: 0, em: 0, ct: 0, btc: 0, crypto: 0 };
  for (const e of entries) {
    if (e.poche === 'ct') {
      r.ct += e.amount;
      if (e.breakdown_world != null) {
        r.world += e.breakdown_world || 0;
        r.nasdaq += e.breakdown_nasdaq || 0;
        r.europe += e.breakdown_eur || 0;
        r.em += e.breakdown_em || 0;
      } else {
        r.world += e.amount * TARGET_ALLOC.world;
        r.nasdaq += e.amount * TARGET_ALLOC.nasdaq;
        r.europe += e.amount * TARGET_ALLOC.europe;
        r.em += e.amount * TARGET_ALLOC.em;
      }
    } else {
      r.btc += e.amount;
      r.crypto += e.amount;
    }
  }
  return r;
}

// Get most recent value for each actif
export function latestValues(values) {
  const map = {};
  for (const v of [...values].sort((a, b) => a.date.localeCompare(b.date))) {
    map[v.actif] = v.value;
  }
  // Compute CT total if individual assets present
  const hasIndividuals = ['world', 'nasdaq', 'europe', 'em'].every(k => map[k] != null);
  if (hasIndividuals && map.total == null) {
    map.total = (map.world || 0) + (map.nasdaq || 0) + (map.europe || 0) + (map.em || 0);
  }
  return map;
}

// Build global time-series for chart
export function buildTimeSeries(entries, values) {
  const dateSet = new Set([...entries.map(e => e.date), ...values.map(v => v.date)]);
  if (!dateSet.size) return [];
  const dates = Array.from(dateSet).sort();

  const ctE = [...entries].filter(e => e.poche === 'ct').sort((a, b) => a.date.localeCompare(b.date));
  const crE = [...entries].filter(e => e.poche === 'crypto').sort((a, b) => a.date.localeCompare(b.date));

  // Map date -> latest CT total value
  const ctValMap = {};
  const crValMap = {};
  for (const v of [...values].sort((a, b) => a.date.localeCompare(b.date))) {
    if (v.actif === 'total') ctValMap[v.date] = v.value;
    if (v.actif === 'btc') crValMap[v.date] = v.value;
  }
  // Also compute total from individuals when available
  const byDate = {};
  for (const v of values) {
    if (!byDate[v.date]) byDate[v.date] = {};
    byDate[v.date][v.actif] = v.value;
  }
  for (const [date, map] of Object.entries(byDate)) {
    if (!ctValMap[date]) {
      const sum = (map.world || 0) + (map.nasdaq || 0) + (map.europe || 0) + (map.em || 0);
      if (sum > 0) ctValMap[date] = sum;
    }
  }

  let ctInv = 0, crInv = 0, lastCtV = null, lastCrV = null;
  const data = [];
  for (const date of dates) {
    ctE.filter(e => e.date === date).forEach(e => ctInv += e.amount);
    crE.filter(e => e.date === date).forEach(e => crInv += e.amount);
    if (ctValMap[date] != null) lastCtV = ctValMap[date];
    if (crValMap[date] != null) lastCrV = crValMap[date];
    data.push({ date, ctInvested: ctInv || null, ctValue: lastCtV, cryptoInvested: crInv || null, cryptoValue: lastCrV });
  }
  return data;
}

// Build time-series for a single asset
export function buildAssetTimeSeries(asset, entries, values) {
  const isCtAsset = ['world', 'nasdaq', 'europe', 'em'].includes(asset);
  const relevantValues = values.filter(v => v.actif === asset).sort((a, b) => a.date.localeCompare(b.date));
  const relevantEntries = entries.filter(e => e.poche === (isCtAsset ? 'ct' : 'crypto')).sort((a, b) => a.date.localeCompare(b.date));

  const dateSet = new Set([...relevantEntries.map(e => e.date), ...relevantValues.map(v => v.date)]);
  if (!dateSet.size) return [];
  const dates = Array.from(dateSet).sort();

  const valMap = {};
  relevantValues.forEach(v => valMap[v.date] = v.value);

  let cumInv = 0, lastVal = null;
  return dates.map(date => {
    relevantEntries.filter(e => e.date === date).forEach(e => {
      if (isCtAsset) {
        if (e.breakdown_world != null) {
          const map = { world: e.breakdown_world, nasdaq: e.breakdown_nasdaq, europe: e.breakdown_eur, em: e.breakdown_em };
          cumInv += map[asset] || 0;
        } else {
          cumInv += e.amount * TARGET_ALLOC[asset];
        }
      } else {
        cumInv += e.amount;
      }
    });
    if (valMap[date] != null) lastVal = valMap[date];
    return { date, invested: cumInv || null, value: lastVal };
  });
}

// Project DCA future value
export function projectDCA(monthly, annualRate, years) {
  const n = years * 12;
  const r = annualRate / 100 / 12;
  const invested = monthly * n;
  const value = r === 0 ? invested : monthly * ((Math.pow(1 + r, n) - 1) / r);
  return { invested, value, gains: value - invested, multiplier: invested > 0 ? value / invested : 1 };
}

export function buildProjectionData(monthly, annualRate, totalYears) {
  const r = annualRate / 100 / 12;
  return Array.from({ length: totalYears + 1 }, (_, y) => {
    const n = y * 12;
    const invested = monthly * n;
    const value = r === 0 ? invested : monthly * ((Math.pow(1 + r, n) - 1) / r);
    return { year: y, invested, value };
  });
}

export function annualSummary(entries) {
  const map = {};
  for (const e of entries) {
    const year = e.date.slice(0, 4);
    if (!map[year]) map[year] = { year, ct: 0, crypto: 0 };
    if (e.poche === 'ct') map[year].ct += e.amount;
    else map[year].crypto += e.amount;
  }
  return Object.values(map).sort((a, b) => b.year.localeCompare(a.year)).map(r => ({ ...r, total: r.ct + r.crypto }));
}

export function toCSV(entries) {
  const header = 'id,poche,amount,date,note,type,world,nasdaq,europe,em';
  const rows = entries.map(e =>
    [e.id, e.poche, e.amount, e.date, `"${(e.note || '').replace(/"/g, '""')}"`, e.type,
      e.breakdown_world ?? '', e.breakdown_nasdaq ?? '', e.breakdown_eur ?? '', e.breakdown_em ?? ''].join(',')
  );
  return [header, ...rows].join('\n');
}
