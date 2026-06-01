import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { api } from '../lib/api.js';
import { fmtCurrency, fmtPct, fmtDate, today, calcCAGR, daysSince, getLastEntryDate, investedPerAsset, latestValues, buildTimeSeries, COLORS } from '../lib/utils.js';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [e, v] = await Promise.all([api.entries.list(), api.values.list()]);
    setEntries(e); setValues(v); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const inv = useMemo(() => investedPerAsset(entries), [entries]);
  const lv = useMemo(() => latestValues(values), [values]);
  const chartData = useMemo(() => buildTimeSeries(entries, values), [entries, values]);

  const ctValue = lv.total ?? null;
  const cryptoValue = lv.btc ?? null;
  const totalValue = (ctValue ?? 0) + (cryptoValue ?? 0);
  const totalInvested = inv.ct + inv.crypto;
  const pnl = ctValue != null || cryptoValue != null ? totalValue - totalInvested : null;
  const pnlPct = totalInvested > 0 && pnl != null ? (pnl / totalInvested) * 100 : null;

  const firstDate = entries.length ? [...entries].sort((a, b) => a.date.localeCompare(b.date))[0].date : null;
  const cagr = calcCAGR(totalInvested, totalValue, firstDate);

  const lastEntryDate = getLastEntryDate(entries);
  const showAlert = daysSince(lastEntryDate) > 35;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-ct border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {entries.length > 0 && lastEntryDate && (
          <span className="text-xs text-gray-400">Dernier versement : {fmtDate(lastEntryDate)}</span>
        )}
      </div>

      {showAlert && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <span className="text-lg">⚠️</span>
          <span>Aucun versement depuis plus de 35 jours. Pensez à effectuer votre DCA mensuel !</span>
        </div>
      )}

      {/* Global metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total investi" value={fmtCurrency(totalInvested)} />
        <MetricCard label="Valeur actuelle" value={totalValue > 0 ? fmtCurrency(totalValue) : '—'} />
        <MetricCard
          label="Plus/Moins-value"
          value={pnl != null ? fmtCurrency(pnl) : '—'}
          sub={pnlPct != null ? fmtPct(pnlPct) : null}
          positive={pnl != null && pnl >= 0}
          colored
        />
        <MetricCard
          label="CAGR estimé"
          value={cagr != null ? fmtPct(cagr) : '—'}
          positive={cagr != null && cagr >= 0}
          colored
          sub={cagr != null ? 'annualisé' : null}
        />
      </div>

      {/* CT + Crypto cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PocheCard
          label="Compte-Titres"
          badge="CT"
          color={COLORS.ct}
          invested={inv.ct}
          value={ctValue}
          firstDate={entries.filter(e => e.poche === 'ct').sort((a, b) => a.date.localeCompare(b.date))[0]?.date}
        />
        <PocheCard
          label="Wallet Crypto"
          badge="Crypto"
          color={COLORS.crypto}
          invested={inv.crypto}
          value={cryptoValue}
          firstDate={entries.filter(e => e.poche === 'crypto').sort((a, b) => a.date.localeCompare(b.date))[0]?.date}
        />
      </div>

      {/* Evolution chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium mb-4">Évolution du portefeuille</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} className="text-gray-400" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}k`} className="text-gray-400" />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ctInvested" name="CT Investi" stroke={COLORS.ct} strokeDasharray="5 3" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="ctValue" name="CT Valeur" stroke={COLORS.ct} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="cryptoInvested" name="BTC Investi" stroke={COLORS.crypto} strokeDasharray="5 3" strokeWidth={1.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="cryptoValue" name="BTC Valeur" stroke={COLORS.crypto} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Update values form */}
      <UpdateValuesForm onSaved={load} />
    </div>
  );
}

function MetricCard({ label, value, sub, colored, positive }) {
  const valueClass = colored ? (positive ? 'positive' : 'negative') : 'text-gray-900 dark:text-white';
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className={`text-lg font-semibold ${valueClass}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${colored ? (positive ? 'text-emerald-500' : 'text-red-400') : 'text-gray-400'}`}>{sub}</div>}
    </div>
  );
}

function PocheCard({ label, badge, color, invested, value, firstDate }) {
  const pnl = value != null ? value - invested : null;
  const pnlPct = invested > 0 && pnl != null ? (pnl / invested) * 100 : null;
  const cagr = calcCAGR(invested, value, firstDate);
  const isCT = badge === 'CT';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{label}</span>
        <span className={isCT ? 'badge-ct' : 'badge-crypto'}>{badge}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="metric-label">Investi</div>
          <div className="font-semibold" style={{ color }}>{fmtCurrency(invested)}</div>
        </div>
        <div>
          <div className="metric-label">Valeur actuelle</div>
          <div className="font-semibold text-gray-900 dark:text-white">{value != null ? fmtCurrency(value) : '—'}</div>
        </div>
        <div>
          <div className="metric-label">Performance</div>
          <div className={`font-semibold text-sm ${pnl == null ? 'text-gray-400' : pnl >= 0 ? 'positive' : 'negative'}`}>
            {pnl != null ? fmtCurrency(pnl) : '—'}
            {pnlPct != null && <span className="ml-1 text-xs">({fmtPct(pnlPct)})</span>}
          </div>
        </div>
        <div>
          <div className="metric-label">CAGR</div>
          <div className={`font-semibold text-sm ${cagr == null ? 'text-gray-400' : cagr >= 0 ? 'positive' : 'negative'}`}>
            {cagr != null ? fmtPct(cagr) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateValuesForm({ onSaved }) {
  const [mode, setMode] = useState('individual'); // 'individual' | 'total'
  const [date, setDate] = useState(today());
  const [world, setWorld] = useState('');
  const [nasdaq, setNasdaq] = useState('');
  const [europe, setEurope] = useState('');
  const [em, setEm] = useState('');
  const [ctTotal, setCtTotal] = useState('');
  const [btc, setBtc] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const items = [];
      if (mode === 'individual') {
        if (world) items.push({ poche: 'ct', actif: 'world', value: parseFloat(world), date });
        if (nasdaq) items.push({ poche: 'ct', actif: 'nasdaq', value: parseFloat(nasdaq), date });
        if (europe) items.push({ poche: 'ct', actif: 'europe', value: parseFloat(europe), date });
        if (em) items.push({ poche: 'ct', actif: 'em', value: parseFloat(em), date });
      } else {
        if (ctTotal) items.push({ poche: 'ct', actif: 'total', value: parseFloat(ctTotal), date });
      }
      if (btc) items.push({ poche: 'crypto', actif: 'btc', value: parseFloat(btc), date });
      if (!items.length) { setMsg('Aucune valeur saisie.'); setLoading(false); return; }
      await api.values.add(items);
      setMsg('Valeurs enregistrées !');
      setWorld(''); setNasdaq(''); setEurope(''); setEm(''); setCtTotal(''); setBtc('');
      onSaved();
    } catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card">
      <h2 className="text-sm font-medium mb-4">Mettre à jour les valeurs</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="label mb-0">Date</label>
          <input type="date" className="input w-44" value={date} onChange={e => setDate(e.target.value)} max={today()} />
        </div>

        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => setMode('individual')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${mode === 'individual' ? 'bg-ct text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
            Par actif
          </button>
          <button type="button" onClick={() => setMode('total')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${mode === 'total' ? 'bg-ct text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
            Valeur totale CT
          </button>
        </div>

        {mode === 'individual' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <NumInput label="MSCI World (€)" value={world} onChange={setWorld} color={COLORS.ct} />
            <NumInput label="Nasdaq-100 (€)" value={nasdaq} onChange={setNasdaq} color={COLORS.nasdaq} />
            <NumInput label="MSCI Europe (€)" value={europe} onChange={setEurope} color={COLORS.europe} />
            <NumInput label="MSCI EM (€)" value={em} onChange={setEm} color={COLORS.em} />
          </div>
        ) : (
          <NumInput label="Total Compte-Titres (€)" value={ctTotal} onChange={setCtTotal} color={COLORS.ct} />
        )}

        <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
          <NumInput label="Bitcoin (€)" value={btc} onChange={setBtc} color={COLORS.crypto} />
        </div>

        {msg && <p className={`text-xs ${msg.includes('!') ? 'text-emerald-500' : 'text-red-500'}`}>{msg}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer les valeurs'}
        </button>
      </form>
    </div>
  );
}

function NumInput({ label, value, onChange, color }) {
  return (
    <div>
      <label className="label" style={{ color }}>{label}</label>
      <input type="number" min="0" step="0.01" className="input" value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" />
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs space-y-1">
      <div className="font-medium mb-1">{fmtDate(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{fmtCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
