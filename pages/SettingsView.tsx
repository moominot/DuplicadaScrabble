
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { updateConfig, updateRoundNumber, resetGame } from '../services/gameService';
import { useGame } from '../hooks/useGame';

const SettingsView: React.FC = () => {
    const [searchParams] = useSearchParams();
    const gameId = searchParams.get('gameId');
    const navigate = useNavigate();
    const { gameState, loading } = useGame(gameId);
    
    const [timerDuration, setTimerDuration] = useState('180');
    const [gracePeriod, setGracePeriod] = useState('10');
    const [judgeName, setJudgeName] = useState('');
    const [roundNum, setRoundNum] = useState('1');
    
    // Delete confirmation state
    const [deleteStep, setDeleteStep] = useState(0);

    useEffect(() => {
        if(gameState) {
            setTimerDuration(gameState.config.timerDurationSeconds.toString());
            setGracePeriod((gameState.config.gracePeriodSeconds || 10).toString());
            setJudgeName(gameState.config.judgeName);
            setRoundNum(gameState.round.toString());
        }
    }, [gameState]);

    const handleSave = async () => {
        if(!gameId) return;
        await updateConfig(gameId, {
            timerDurationSeconds: parseInt(timerDuration) || 180,
            gracePeriodSeconds: parseInt(gracePeriod) || 10,
            judgeName: judgeName
        });
        await updateRoundNumber(gameId, parseInt(roundNum) || 1);
        navigate(`/master?gameId=${gameId}`);
    };

    const handleReset = async () => {
        if (deleteStep === 0) {
            setDeleteStep(1);
            return;
        }
        
        if (gameId) {
            await resetGame(gameId);
        }
    }

    if(loading) return <div>Carregant...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gray-800 text-white p-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Configuració</h1>
                    <Link to={`/master?gameId=${gameId}`} className="text-gray-300 hover:text-white">✕ Tancar</Link>
                </div>
                
                <div className="p-8 space-y-6">
                    
                    {/* Timer Settings */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block font-bold text-gray-700">Durada Ronda (segons)</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="number" 
                                    value={timerDuration}
                                    onChange={(e) => setTimerDuration(e.target.value)}
                                    className="border p-3 rounded w-full text-xl font-mono font-bold"
                                />
                            </div>
                            <p className="text-xs text-gray-500">180 = 3 min</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block font-bold text-gray-700">Temps de Gràcia (segons)</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="number" 
                                    value={gracePeriod}
                                    onChange={(e) => setGracePeriod(e.target.value)}
                                    className="border p-3 rounded w-full text-xl font-mono font-bold"
                                />
                            </div>
                            <p className="text-xs text-gray-500">Temps extra abans de penalitzar.</p>
                        </div>
                    </div>

                    {/* Round Edit */}
                    <div className="space-y-2">
                        <label className="block font-bold text-gray-700">Forçar Número de Ronda</label>
                        <input 
                            type="number" 
                            value={roundNum}
                            onChange={(e) => setRoundNum(e.target.value)}
                            className="border p-3 rounded w-32 text-xl font-mono font-bold"
                        />
                    </div>

                    {/* Judge Name */}
                    <div className="space-y-2">
                        <label className="block font-bold text-gray-700">Nom del Jutge / Màster</label>
                        <input 
                            type="text" 
                            value={judgeName}
                            onChange={(e) => setJudgeName(e.target.value)}
                            className="border p-3 rounded w-full"
                        />
                    </div>

                    <hr className="my-6" />

                    {/* Danger Zone */}
                    <div className="bg-red-50 p-4 rounded border border-red-100">
                        <h3 className="text-red-800 font-bold mb-2">Zona de Perill</h3>
                        <button 
                            onClick={handleReset}
                            className={`text-white px-4 py-2 rounded font-bold text-sm transition-all shadow-sm
                                ${deleteStep === 1 ? 'bg-red-800 scale-105 ring-2 ring-red-400' : 'bg-red-600 hover:bg-red-700'}
                            `}
                        >
                            {deleteStep === 1 ? 'SEGUR? CLICA PER CONFIRMAR ESBORRAT' : 'Esborrar Partida'}
                        </button>
                        {deleteStep === 1 && (
                            <button 
                                onClick={() => setDeleteStep(0)} 
                                className="ml-4 text-gray-500 underline text-sm"
                            >
                                Cancel·lar
                            </button>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-4">
                        <Link to={`/master?gameId=${gameId}`} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel·lar</Link>
                        <button onClick={handleSave} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-lg">
                            Guardar Canvis
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
