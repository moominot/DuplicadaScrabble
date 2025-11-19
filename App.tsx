
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import PlayerView from './pages/PlayerView';
import MasterView from './pages/MasterView';
import ProjectorView from './pages/ProjectorView';
import SettingsView from './pages/SettingsView';

const Home = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-8 p-4">
    <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-tighter">Scrabble Duplicat</h1>
        <p className="text-slate-400">Selecciona el teu rol per començar</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Link to="/player" className="group relative bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-green-500 transition-all hover:-translate-y-1">
            <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-100 transition-opacity">📱</div>
            <h2 className="text-2xl font-bold mb-2 text-green-400">Jugador</h2>
            <p className="text-slate-400 text-sm">Entra a la partida, envia les teves paraules i competeix.</p>
        </Link>

        <Link to="/master" className="group relative bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-blue-500 transition-all hover:-translate-y-1">
            <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-100 transition-opacity">👑</div>
            <h2 className="text-2xl font-bold mb-2 text-blue-400">Jutge / Master</h2>
            <p className="text-slate-400 text-sm">Gestiona el tauler, valida les jugades i consulta rànquings.</p>
        </Link>

        <Link to="/projector" className="group relative bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-purple-500 transition-all hover:-translate-y-1">
            <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-100 transition-opacity">📺</div>
            <h2 className="text-2xl font-bold mb-2 text-purple-400">Projector</h2>
            <p className="text-slate-400 text-sm">Vista passiva per a pantalla gran amb rellotge i tauler.</p>
        </Link>
    </div>

    <footer className="fixed bottom-4 text-slate-600 text-xs">
        v1.1.0 • React 18 • LocalStorage Sync • Gemini API
    </footer>
  </div>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/player" element={<PlayerView />} />
        <Route path="/master" element={<MasterView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/projector" element={<ProjectorView />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
