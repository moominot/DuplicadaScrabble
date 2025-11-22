
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createNewGame, getPublicGames } from '../services/gameService';

const LobbyView: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostName, setHostName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
        const list = await getPublicGames();
        setGames(list);
    } catch (e) {
        console.error("Error carregant partides:", e);
    } finally {
        setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName) return;
    
    setIsCreating(true);
    setErrorMsg(null);

    try {
        const gameId = await createNewGame(hostName);
        navigate(`/master?gameId=${gameId}`);
    } catch (error: any) {
        console.error("Error detallat:", error);
        let msg = "Error desconegut creant la partida.";
        
        if (error.code === 'PERMISSION_DENIED') {
            msg = "PERMÍS DENEGAT: Comprova les 'Rules' a Firebase Console. Han de ser '.read': true, '.write': true.";
        } else if (error.message) {
            msg = `Error: ${error.message}`;
        }
        
        setErrorMsg(msg);
    } finally {
        setIsCreating(false);
    }
  };

  const joinGame = (gameId: string, role: 'player' | 'master' | 'projector') => {
      navigate(`/${role}?gameId=${gameId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
            <h1 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                Scrabble DupliCat
            </h1>
            <p className="text-slate-400 text-xl">Sala de Partides Online</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
            
            {/* Llista de partides */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span>🌍</span> Partides Actives
                    </h2>
                    <button onClick={loadGames} className="text-sm text-blue-400 hover:text-blue-300">Actualitzar</button>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-slate-500 animate-pulse">Carregant...</div>
                ) : games.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 italic">No hi ha partides actives. Crea'n una!</div>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {games.map((g) => (
                            <div key={g.id} className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 hover:border-slate-500 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-lg">{g.host}'s Game</div>
                                        <div className="text-xs text-slate-400">Ronda {g.round} • Creat {new Date(g.createdAt).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => joinGame(g.id, 'player')}
                                        className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded-lg font-bold text-sm transition-colors"
                                    >
                                        JUGAR
                                    </button>
                                    <button 
                                        onClick={() => joinGame(g.id, 'projector')}
                                        className="px-3 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-bold text-sm transition-colors"
                                        title="Projector"
                                    >
                                        📺
                                    </button>
                                    <button 
                                        onClick={() => joinGame(g.id, 'master')}
                                        className="px-3 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-bold text-sm transition-colors"
                                        title="Màster"
                                    >
                                        👑
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Crear nova partida */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-800 rounded-2xl p-6 border border-indigo-500/30 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span>🚀</span> Nova Partida
                </h2>
                <form onSubmit={handleCreate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-indigo-200 mb-2 uppercase">Nom de l'Organitzador / Club</label>
                        <input 
                            type="text" 
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                            placeholder="Ex: Club Scrabble Manacor"
                            className="w-full p-4 bg-slate-900/50 border border-indigo-500/30 rounded-xl text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {errorMsg}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isCreating || !hostName}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? 'Creant...' : 'CREAR PARTIDA I ENTRAR COM A MÀSTER'}
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;
