import { useState } from 'react';
import { api } from '../lib/api.js';

export default function Setup({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 6) { setError('Minimum 6 caractères'); return; }
    setLoading(true);
    try {
      await api.auth.setup(password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-ct rounded-xl flex items-center justify-center text-white text-lg font-bold">TR</div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">Trade Republic Tracker</div>
            <div className="text-xs text-gray-500">Première utilisation</div>
          </div>
        </div>

        <div className="card">
          <h1 className="text-lg font-semibold mb-2">Créer votre mot de passe</h1>
          <p className="text-sm text-gray-500 mb-5">Ce mot de passe protège votre tableau de bord.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Mot de passe</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 caractères" autoFocus required />
            </div>
            <div>
              <label className="label">Confirmer</label>
              <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répétez le mot de passe" required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
