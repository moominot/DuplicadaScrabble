
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getGameState, updateConfig, updateRoundNumber, resetGame } from '../services/gameService';

const SettingsView: React.FC = () => {
    const state = getGameState();
    const navigate = useNavigate();
    
    const [timerDuration, setTimerDuration] = useState(state.config.timerDurationSeconds.toString());
    const [judgeName, setJudgeName] = useState(state.config.judgeName);
    const [roundNum, setRoundNum] = useState(state.round.toString());

    const handleSave = () => {
        updateConfig({
            timerDurationSeconds: parseInt(timerDuration) || 180,
            judgeName: judgeName
        });
        updateRoundNumber(parseInt(roundNum) || 1);
        navigate('/master');
    };

    const handleReset = () => {
        if(window.confirm("ESTÀS SEGUR? Això esborrarà tota la partida.")) {
            resetGame();
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gray-800 text-white p-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Configuració</h1>
                    <Link to="/master" className="text-gray-300 hover:text-white">✕ Tancar</Link>
                </div>
                
                <div className="p-8 space-y-6">
                    
                    {/* Timer Settings */}
                    <div className="space-y-2">
                        <label className="block font-bold text-gray-700">Durada del Temporitzador (segons)</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                value={timerDuration}
                                onChange={(e) => setTimerDuration(e.target.value)}
                                className="border p-3 rounded w-32 text-xl font-mono font-bold"
                            />
                            <span className="text-gray-500 text-sm">
                                (180 = 3 minuts, 120 = 2 minuts)
                            </span>
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
                        <p className="text-xs text-yellow-600">Atenció: Canviar això manualment no desfà les jugades al tauler, només canvia el comptador.</p>
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
                            className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 text-sm"
                        >
                            Reiniciar Partida Completament
                        </button>
                    </div>

                    <div className="pt-4 flex justify-end gap-4">
                        <Link to="/master" className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel·lar</Link>
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
