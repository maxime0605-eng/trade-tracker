import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api.js';
import Login from './components/Login.jsx';
import Setup from './components/Setup.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './components/Dashboard.jsx';
import AddEntry from './components/AddEntry.jsx';
import Assets from './components/Assets.jsx';
import Projection from './components/Projection.jsx';
import History from './components/History.jsx';

export default function App() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, needsSetup: false });

  useEffect(() => {
    api.auth.status().then(data => setAuth({ loading: false, ...data })).catch(() => setAuth({ loading: false, authenticated: false, needsSetup: false }));
  }, []);

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-ct border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (auth.needsSetup) {
    return <Setup onDone={() => setAuth({ loading: false, authenticated: true, needsSetup: false })} />;
  }

  if (!auth.authenticated) {
    return <Login onLogin={() => setAuth({ loading: false, authenticated: true, needsSetup: false })} />;
  }

  return (
    <BrowserRouter>
      <Layout onLogout={() => setAuth({ loading: false, authenticated: false, needsSetup: false })}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddEntry />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/projection" element={<Projection />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
