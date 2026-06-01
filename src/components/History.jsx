import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api.js';
import { fmtCurrency, fmtDate, today, annualSummary, toCSV, ASSET_LABELS, COLORS } from '../lib/utils.js';

export default function History() {
  const [entries, setEntries] = useState([]);
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');

  async function load() {
    const [e, v] = await Promise.all([api.entries.list(), api.values.list()]);
    setEntries(e); setValues(v); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const summary = useMemo(() => annualSummary(entries), [entries]);

  async function handleClearAll() {
    await Promise.all([api.entries.clear(), api.values.clear()]);
    setConfirmClear(false);
    load();
  }

  function handleExportCSV() {
    const csv = toCSV(entries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `versements_${today()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-ct border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Historique</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="btn-ghost text-xs" disabled={!entries.length}>
            Exporter CSV
          </button>
          <button onClick={() => setConfirmClear(true)} className="btn-danger text-xs" disabled={!entries.length && !values.length}>
            Tout effacer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {[['entries', 'Versements'], ['summary', 'Résumé annuel'], ['values', 'Valeurs']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'entries' && <EntriesList entries={entries} onRefresh={load} />}
      {activeTab === 'summary' && <AnnualSummary summary={summary} />}
      {activeTab === 'values' && <ValuesList values={values} onRefresh={load} />}

      {confirmClear && (
        <ConfirmModal
          message="Supprimer TOUS les versements et toutes les valeurs ? Cette action est irréversible."
          onConfirm={handleClearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}

function EntriesList({ entries, onRefresh }) {
  const [editId, setEditId] = useState(null);

  if (!entries.length) return <p className="text-sm text-gray-400 text-center py-8">Aucun versement enregistré.</p>;

  return (
    <div className="space-y-2">
      {entries.map(e => (
        editId === e.id
          ? <EditEntry key={e.id} entry={e} onDone={() => { setEditId(null); onRefresh(); }} onCancel={() => setEditId(null)} />
          : <EntryRow key={e.id} entry={e} onEdit={() => setEditId(e.id)} onDelete={async () => { await api.entries.remove(e.id); onRefresh(); }} />
      ))}
    </div>
  );
}

function EntryRow({ entry, onEdit, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isCT = entry.poche === 'ct';
  const hasBreakdown = entry.breakdown_world != null;

  return (
    <div className="card flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={isCT ? 'badge-ct' : 'badge-crypto'}>{isCT ? 'CT' : 'BTC'}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{fmtCurrency(entry.amount)}</div>
          <div className="text-xs text-gray-400">{fmtDate(entry.date)}{entry.note ? ` · ${entry.note}` : ''}</div>
          {hasBreakdown && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[['world', entry.breakdown_world], ['nasdaq', entry.breakdown_nasdaq], ['europe', entry.breakdown_eur], ['em', entry.breakdown_em]].map(([k, v]) =>
                v ? <span key={k} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: COLORS[k] + '22', color: COLORS[k] }}>{ASSET_LABELS[k]} {fmtCurrency(v)}</span> : null
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {confirmDel ? (
          <>
            <span className="text-xs text-red-500 mr-1">Supprimer ?</span>
            <button onClick={onDelete} className="text-xs text-red-500 underline hover:no-underline">Oui</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => setConfirmDel(false)} className="text-xs text-gray-400 underline hover:no-underline">Non</button>
          </>
        ) : (
          <>
            <button onClick={onEdit} className="btn-ghost text-xs px-2 py-1">Modifier</button>
            <button onClick={() => setConfirmDel(true)} className="btn-danger text-xs px-2 py-1">Supprimer</button>
          </>
        )}
      </div>
    </div>
  );
}

function EditEntry({ entry, onDone, onCancel }) {
  const [amount, setAmount] = useState(entry.amount.toString());
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.note || '');
  const [world, setWorld] = useState(entry.breakdown_world?.toString() || '');
  const [nasdaq, setNasdaq] = useState(entry.breakdown_nasdaq?.toString() || '');
  const [europe, setEurope] = useState(entry.breakdown_eur?.toString() || '');
  const [em, setEm] = useState(entry.breakdown_em?.toString() || '');
  const [loading, setLoading] = useState(false);
  const hasBreakdown = entry.breakdown_world != null;

  const computedAmount = hasBreakdown
    ? [world, nasdaq, europe, em].reduce((s, v) => s + (parseFloat(v) || 0), 0)
    : parseFloat(amount) || 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await api.entries.update(entry.id, {
      amount: hasBreakdown ? computedAmount : parseFloat(amount),
      date, note,
      breakdown_world: hasBreakdown ? (parseFloat(world) || null) : null,
      breakdown_nasdaq: hasBreakdown ? (parseFloat(nasdaq) || null) : null,
      breakdown_eur: hasBreakdown ? (parseFloat(europe) || null) : null,
      breakdown_em: hasBreakdown ? (parseFloat(em) || null) : null,
    });
    onDone();
  }

  return (
    <div className="card border-ct/40">
      <h3 className="text-xs font-medium text-ct mb-3">Modifier le versement</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {hasBreakdown ? (
          <div className="grid grid-cols-2 gap-2">
            {[['MSCI World', world, setWorld, COLORS.ct], ['Nasdaq-100', nasdaq, setNasdaq, COLORS.nasdaq], ['MSCI Europe', europe, setEurope, COLORS.europe], ['MSCI EM', em, setEm, COLORS.em]].map(([label, val, setter, color]) => (
              <div key={label}>
                <label className="label text-[10px]" style={{ color }}>{label}</label>
                <input type="number" min="0" step="0.01" className="input text-sm" value={val} onChange={e => setter(e.target.value)} />
              </div>
            ))}
            <div className="col-span-2 text-xs font-medium" style={{ color: COLORS.ct }}>Total : {fmtCurrency(computedAmount)}</div>
          </div>
        ) : (
          <div>
            <label className="label">Montant (€)</label>
            <input type="number" min="0.01" step="0.01" className="input" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} max={today()} required />
          </div>
          <div>
            <label className="label">Note</label>
            <input type="text" className="input" value={note} onChange={e => setNote(e.target.value)} maxLength={120} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1 text-xs">Annuler</button>
          <button type="submit" className="btn-primary flex-1 text-xs" disabled={loading}>{loading ? '…' : 'Sauvegarder'}</button>
        </div>
      </form>
    </div>
  );
}

function AnnualSummary({ summary }) {
  if (!summary.length) return <p className="text-sm text-gray-400 text-center py-8">Aucune donnée.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
            <th className="text-left pb-2 font-medium">Année</th>
            <th className="text-right pb-2 font-medium">CT investi</th>
            <th className="text-right pb-2 font-medium">Bitcoin</th>
            <th className="text-right pb-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(row => (
            <tr key={row.year} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
              <td className="py-2 font-semibold">{row.year}</td>
              <td className="py-2 text-right" style={{ color: COLORS.ct }}>{fmtCurrency(row.ct)}</td>
              <td className="py-2 text-right" style={{ color: COLORS.crypto }}>{fmtCurrency(row.crypto)}</td>
              <td className="py-2 text-right font-semibold">{fmtCurrency(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 dark:border-gray-700">
          <tr>
            <td className="pt-2 font-semibold text-xs text-gray-400">Total</td>
            <td className="pt-2 text-right font-semibold text-xs" style={{ color: COLORS.ct }}>{fmtCurrency(summary.reduce((s, r) => s + r.ct, 0))}</td>
            <td className="pt-2 text-right font-semibold text-xs" style={{ color: COLORS.crypto }}>{fmtCurrency(summary.reduce((s, r) => s + r.crypto, 0))}</td>
            <td className="pt-2 text-right font-semibold text-xs">{fmtCurrency(summary.reduce((s, r) => s + r.total, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ValuesList({ values, onRefresh }) {
  if (!values.length) return <p className="text-sm text-gray-400 text-center py-8">Aucune valeur enregistrée.</p>;
  const sorted = [...values].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  return (
    <div className="space-y-2">
      {sorted.map(v => (
        <div key={v.id} className="card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[v.actif] || (v.poche === 'ct' ? COLORS.ct : COLORS.crypto) }} />
            <div>
              <span className="text-sm font-semibold">{ASSET_LABELS[v.actif] || v.actif}</span>
              <span className="text-xs text-gray-400 ml-2">{fmtDate(v.date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">{fmtCurrency(v.value)}</span>
            <DeleteBtn onDelete={async () => { await api.values.remove(v.id); onRefresh(); }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DeleteBtn({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <div className="flex items-center gap-1 text-xs">
      <button onClick={onDelete} className="text-red-500 underline">Oui</button>
      <span className="text-gray-300">|</span>
      <button onClick={() => setConfirm(false)} className="text-gray-400 underline">Non</button>
    </div>
  );
  return <button onClick={() => setConfirm(true)} className="btn-danger text-xs px-2 py-1">✕</button>;
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onCancel} />
      <div className="relative card w-full max-w-sm z-10 space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1">Annuler</button>
          <button onClick={onConfirm} className="btn-danger flex-1 justify-center font-medium">Tout effacer</button>
        </div>
      </div>
    </div>
  );
}
