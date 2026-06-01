import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../lib/api.js';
import { fmtCurrency, fmtPct, fmtDate, calcCAGR, investedPerAsset, buildAssetTimeSeries, COLORS, ASSET_LABELS, TARGET_ALLOC, TARGET_MONTHLY } from '../lib/utils.js';

const CT_ASSETS = ['world', 'nasdaq', 'europe', 'em'];

export default function Assets() {
  const [entries, setEntries] = useState([]);
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.entries.list(), api.values.list()]).then(([e, v]) => { setEntries(e); setValues(v); setLoading(false); });
  }, []);

  const inv = useMemo(() => investedPerAsset(entries), [entries]);

  // Latest individual values
  const latestByAsset = useMemo(() => {
    const map = {};
    for (const v of [...values].sort((a, b) => a.date.localeCompare(b.date))) {
      map[v.actif] = v.value;
    }
    return map;
  }, [values]);

  // Real allocation from latest individual values
  const ctTotal = (latestByAsset.world ?? 0) + (latestByAsset.nasdaq ?? 0) + (latestByAsset.europe ?? 0) + (latestByAsset.em ?? 0);
  const realAlloc = {};
  if (ctTotal > 0) {
    CT_ASSETS.forEach(a => { realAlloc[a] = (latestByAsset[a] ?? 0) / ctTotal; });
  }

  const firstCtDate = entries.filter(e => e.poche === 'ct').sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
  const firstBtcDate = entries.filter(e => e.poche === 'crypto').sort((a, b) => a.date.localeCompare(b.date))[0]?.date;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-ct border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <h1 className="text-xl font-semibold">Actifs</h1>

      {/* CT Allocation table */}
      <div className="card">
        <h2 className="text-sm font-medium mb-3">Répartition Compte-Titres</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="text-left pb-2 font-medium">Actif</th>
                <th className="text-right pb-2 font-medium">Investi</th>
                <th className="text-right pb-2 font-medium">Cible</th>
                <th className="text-right pb-2 font-medium">Réel</th>
                <th className="text-right pb-2 font-medium">Écart</th>
              </tr>
            </thead>
            <tbody>
              {CT_ASSETS.map(a => {
                const real = ctTotal > 0 ? realAlloc[a] : null;
                const target = TARGET_ALLOC[a];
                const diff = real != null ? (real - target) * 100 : null;
                return (
                  <tr key={a} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[a] }} />
                        <span className="font-medium">{ASSET_LABELS[a]}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 text-gray-700 dark:text-gray-300">{fmtCurrency(inv[a])}</td>
                    <td className="text-right py-2 text-gray-500">{(target * 100).toFixed(0)} %</td>
                    <td className="text-right py-2 font-medium" style={{ color: COLORS[a] }}>{real != null ? `${(real * 100).toFixed(1)} %` : '—'}</td>
                    <td className={`text-right py-2 text-xs font-medium ${diff == null ? 'text-gray-400' : Math.abs(diff) < 1 ? 'text-gray-400' : diff > 0 ? 'positive' : 'negative'}`}>
                      {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} %` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual asset cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CT_ASSETS.map(a => (
          <AssetCard
            key={a}
            asset={a}
            invested={inv[a]}
            currentValue={latestByAsset[a]}
            firstDate={firstCtDate}
            entries={entries}
            values={values}
          />
        ))}
        <AssetCard
          asset="btc"
          invested={inv.btc}
          currentValue={latestByAsset.btc}
          firstDate={firstBtcDate}
          entries={entries}
          values={values}
        />
      </div>
    </div>
  );
}

function AssetCard({ asset, invested, currentValue, firstDate, entries, values }) {
  const color = COLORS[asset];
  const label = ASSET_LABELS[asset];
  const pnl = currentValue != null ? currentValue - invested : null;
  const pnlPct = invested > 0 && pnl != null ? (pnl / invested) * 100 : null;
  const cagr = calcCAGR(invested, currentValue, firstDate);
  const series = useMemo(() => buildAssetTimeSeries(asset, entries, values), [asset, entries, values]);
  const hasValue = currentValue != null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        {asset === 'btc' ? <span className="badge-crypto">Crypto</span> : <span className="badge-ct">CT</span>}
      </div>

      {!hasValue && (
        <p className="text-xs text-gray-400 italic mb-3">
          Aucune valeur de marché renseignée. Mettez à jour la valeur depuis le Dashboard pour voir les performances.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="metric-label">Investi estimé</div>
          <div className="text-sm font-semibold" style={{ color }}>{fmtCurrency(invested)}</div>
        </div>
        <div>
          <div className="metric-label">Valeur actuelle</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{hasValue ? fmtCurrency(currentValue) : '—'}</div>
        </div>
        <div>
          <div className="metric-label">Performance</div>
          <div className={`text-sm font-semibold ${pnl == null ? 'text-gray-400' : pnl >= 0 ? 'positive' : 'negative'}`}>
            {pnl != null ? fmtCurrency(pnl) : '—'}
            {pnlPct != null && <span className="ml-1 text-xs opacity-80">({fmtPct(pnlPct)})</span>}
          </div>
        </div>
        <div>
          <div className="metric-label">CAGR</div>
          <div className={`text-sm font-semibold ${cagr == null ? 'text-gray-400' : cagr >= 0 ? 'positive' : 'negative'}`}>
            {cagr != null ? fmtPct(cagr) : '—'}
          </div>
        </div>
      </div>

      {series.length > 1 && (
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${Math.round(v)}`} width={40} />
            <Tooltip content={<MiniTooltip color={color} />} />
            <Line type="monotone" dataKey="invested" name="Investi" stroke={color} strokeDasharray="4 2" strokeWidth={1.5} dot={false} connectNulls />
            <Line type="monotone" dataKey="value" name="Valeur" stroke={color} strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function MiniTooltip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs space-y-0.5">
      <div className="font-medium text-gray-500">{fmtDate(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span style={{ color: p.strokeDasharray ? color + '99' : color }}>{p.name}</span>
          <span className="font-medium">{fmtCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
