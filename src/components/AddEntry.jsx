import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { today, TARGET_MONTHLY, COLORS } from '../lib/utils.js';

const TABS = [
  { id: 'detail', label: 'Détaillé CT', badge: 'CT' },
  { id: 'simple', label: 'Simple CT', badge: 'CT' },
  { id: 'btc', label: 'Bitcoin', badge: 'BTC' },
  { id: 'dca', label: 'DCA Complet', badge: '300€' },
];

export default function AddEntry() {
  const [tab, setTab] = useState('detail');
  const navigate = useNavigate();

  function handleSaved() {
    navigate('/');
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-semibold">Ajouter un versement</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-colors min-w-0 ${tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'detail' && <DetailCTForm onSaved={handleSaved} />}
      {tab === 'simple' && <SimpleCTForm onSaved={handleSaved} />}
      {tab === 'btc' && <BTCForm onSaved={handleSaved} />}
      {tab === 'dca' && <DCAForm onSaved={handleSaved} />}
    </div>
  );
}

function DetailCTForm({ onSaved }) {
  const [world, setWorld] = useState('');
  const [nasdaq, setNasdaq] = useState('');
  const [europe, setEurope] = useState('');
  const [em, setEm] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = [world, nasdaq, europe, em].reduce((s, v) => s + (parseFloat(v) || 0), 0);

  function autofill() { setWorld(TARGET_MONTHLY.world.toString()); setNasdaq(TARGET_MONTHLY.nasdaq.toString()); setEurope(TARGET_MONTHLY.europe.toString()); setEm(TARGET_MONTHLY.em.toString()); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!world && !nasdaq && !europe && !em) { setError('Saisissez au moins un montant.'); return; }
    setLoading(true); setError('');
    try {
      await api.entries.add({
        poche: 'ct', amount: total, date, note, type: 'detail',
        breakdown_world: parseFloat(world) || null,
        breakdown_nasdaq: parseFloat(nasdaq) || null,
        breakdown_eur: parseFloat(europe) || null,
        breakdown_em: parseFloat(em) || null,
      });
      onSaved();
    } catch (err) { setError(err.message); setLoading(false); }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge-ct">CT</span>
          <span className="text-sm font-medium text-gray-500">Méthode recommandée</span>
        </div>
        <button type="button" onClick={autofill} className="text-xs text-ct underline">Remplir cibles</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AssetInput label="MSCI World" target={TARGET_MONTHLY.world} color={COLORS.ct} value={world} onChange={setWorld} />
          <AssetInput label="Nasdaq-100" target={TARGET_MONTHLY.nasdaq} color={COLORS.nasdaq} value={nasdaq} onChange={setNasdaq} />
          <AssetInput label="MSCI Europe" target={TARGET_MONTHLY.europe} color={COLORS.europe} value={europe} onChange={setEurope} />
          <AssetInput label="MSCI EM" target={TARGET_MONTHLY.em} color={COLORS.em} value={em} onChange={setEm} />
        </div>

        {total > 0 && (
          <div className="text-sm font-medium" style={{ color: COLORS.ct }}>
            Total CT : {total.toFixed(2)} €
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} max={today()} required />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input type="text" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="ex. DCA Mars" maxLength={120} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </div>
  );
}

function SimpleCTForm({ onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Montant invalide'); return; }
    setLoading(true); setError('');
    try {
      await api.entries.add({ poche: 'ct', amount: parseFloat(amount), date, note, type: 'simple' });
      onSaved();
    } catch (err) { setError(err.message); setLoading(false); }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <span className="badge-ct">CT</span>
        <button type="button" onClick={() => setAmount(TARGET_MONTHLY.ct.toString())} className="text-xs text-ct underline">Remplir ({TARGET_MONTHLY.ct} €)</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Montant total (€)</label>
          <input type="number" min="0.01" step="0.01" className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="250.00" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} max={today()} required />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input type="text" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="ex. DCA Mars" maxLength={120} />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </div>
  );
}

function BTCForm({ onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Montant invalide'); return; }
    setLoading(true); setError('');
    try {
      await api.entries.add({ poche: 'crypto', amount: parseFloat(amount), date, note, type: 'simple' });
      onSaved();
    } catch (err) { setError(err.message); setLoading(false); }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <span className="badge-crypto">BTC</span>
        <button type="button" onClick={() => setAmount(TARGET_MONTHLY.btc.toString())} className="text-xs underline" style={{ color: COLORS.crypto }}>Remplir ({TARGET_MONTHLY.btc} €)</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Montant investi (€)</label>
          <input type="number" min="0.01" step="0.01" className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50.00" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} max={today()} required />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input type="text" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="ex. DCA Mars" maxLength={120} />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" className="btn-primary" style={{ background: COLORS.crypto }} disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </div>
  );
}

function DCAForm({ onSaved }) {
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.entries.add([
        {
          poche: 'ct', amount: TARGET_MONTHLY.ct, date, note: note || 'DCA mensuel', type: 'detail',
          breakdown_world: TARGET_MONTHLY.world, breakdown_nasdaq: TARGET_MONTHLY.nasdaq,
          breakdown_eur: TARGET_MONTHLY.europe, breakdown_em: TARGET_MONTHLY.em,
        },
        {
          poche: 'crypto', amount: TARGET_MONTHLY.btc, date, note: note || 'DCA mensuel', type: 'simple',
        },
      ]);
      onSaved();
    } catch (err) { setError(err.message); setLoading(false); }
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">DCA Complet — 300 €</h2>
        <p className="text-xs text-gray-500">Enregistre en une action les deux poches avec les montants cibles.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: 'MSCI World', v: TARGET_MONTHLY.world, color: COLORS.ct },
          { label: 'Nasdaq-100', v: TARGET_MONTHLY.nasdaq, color: COLORS.nasdaq },
          { label: 'MSCI Europe', v: TARGET_MONTHLY.europe, color: COLORS.europe },
          { label: 'MSCI EM', v: TARGET_MONTHLY.em, color: COLORS.em },
          { label: 'Bitcoin', v: TARGET_MONTHLY.btc, color: COLORS.crypto },
        ].map(({ label, v, color }) => (
          <div key={label} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
            <span style={{ color }}>{label}</span>
            <span className="font-medium">{v} €</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 col-span-2">
          <span className="font-medium">Total</span>
          <span className="font-semibold">{TARGET_MONTHLY.ct + TARGET_MONTHLY.btc} €</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} max={today()} required />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input type="text" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="ex. DCA Mars 2025" maxLength={120} />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" className="btn-primary w-full text-sm font-semibold" disabled={loading}>
          {loading ? 'Enregistrement…' : '✓ Enregistrer DCA Complet 300 €'}
        </button>
      </form>
    </div>
  );
}

function AssetInput({ label, target, color, value, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="label mb-0 text-xs" style={{ color }}>{label}</label>
        <button type="button" onClick={() => onChange(target.toString())} className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
          {target} €
        </button>
      </div>
      <input type="number" min="0" step="0.01" className="input" value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" />
    </div>
  );
}
