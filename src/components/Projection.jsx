import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { fmtCurrency, projectDCA, buildProjectionData, COLORS, TARGET_MONTHLY } from '../lib/utils.js';

export default function Projection() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Projection</h1>
        <p className="text-xs text-gray-400 mt-1">Simulation indicative basée sur des rendements constants. Les performances passées ne garantissent pas les résultats futurs.</p>
      </div>
      <Simulator
        title="Compte-Titres"
        badge="CT"
        badgeClass="badge-ct"
        monthly={TARGET_MONTHLY.ct}
        color={COLORS.ct}
        maxRate={15}
        defaultRate={8}
        defaultYears={30}
      />
      <Simulator
        title="Bitcoin"
        badge="Crypto"
        badgeClass="badge-crypto"
        monthly={TARGET_MONTHLY.btc}
        color={COLORS.crypto}
        maxRate={50}
        defaultRate={20}
        defaultYears={30}
      />
    </div>
  );
}

function Simulator({ title, badge, badgeClass, monthly, color, maxRate, defaultRate, defaultYears }) {
  const [years, setYears] = useState(defaultYears);
  const [rate, setRate] = useState(defaultRate);

  const { invested, value, gains, multiplier } = projectDCA(monthly, rate, years);
  const data = buildProjectionData(monthly, rate, years);

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2">
        <span className={badgeClass}>{badge}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-gray-400">{monthly} €/mois</span>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Horizon</span>
            <span className="text-sm font-semibold" style={{ color }}>{years} ans</span>
          </div>
          <input type="range" min={1} max={40} step={1} value={years} onChange={e => setYears(Number(e.target.value))}
            className="w-full accent-ct h-1.5 rounded cursor-pointer" style={{ accentColor: color }} />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>1 an</span><span>40 ans</span></div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Rendement annuel</span>
            <span className="text-sm font-semibold" style={{ color }}>{rate} %</span>
          </div>
          <input type="range" min={1} max={maxRate} step={0.5} value={rate} onChange={e => setRate(Number(e.target.value))}
            className="w-full h-1.5 rounded cursor-pointer" style={{ accentColor: color }} />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>1 %</span><span>{maxRate} %</span></div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricBox label="Capital investi" value={fmtCurrency(invested)} />
        <MetricBox label="Valeur projetée" value={fmtCurrency(value)} hexColor={color} />
        <MetricBox label="Intérêts composés" value={fmtCurrency(gains)} hexColor="#10b981" />
        <MetricBox label="Multiplicateur" value={`×${multiplier.toFixed(2)}`} hexColor={color} />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.12} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={y => `${y}a`} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
          <Tooltip content={<ProjTooltip color={color} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="invested" name="Investi" stroke={color} strokeDasharray="4 2" fill="none" strokeWidth={1.5} />
          <Area type="monotone" dataKey="value" name="Valeur projetée" stroke={color} fill={`url(#grad-${title})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricBox({ label, value, hexColor }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white" style={hexColor ? { color: hexColor } : {}}>
        {value}
      </div>
    </div>
  );
}

function ProjTooltip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs space-y-1">
      <div className="font-medium text-gray-500">Année {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{fmtCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
