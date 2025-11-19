
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import Board from '../components/Board';
import Tile from '../components/Tile';
import { createTile } from '../utils/scrabbleUtils';
import { RoundStatus } from '../types';
import { ROW_LABELS, COL_LABELS } from '../constants';

const ProjectorView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const navigate = useNavigate();
  
  const { gameState, loading } = useGame(gameId);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if(!gameId) navigate('/');
  }, [gameId, navigate]);

  useEffect(() => {
    if (!gameState) return;
    const updateTimer = () => {
        if (gameState.status === RoundStatus.PLAYING) {
            if (gameState.timerPausedRemaining) {
                 setTimeLeft(Math.ceil(gameState.timerPausedRemaining / 1000));
            } else if (gameState.timerEndTime) {
                 const now = Date.now();
                 const remaining = Math.max(0, Math.ceil((gameState.timerEndTime - now) / 1000));
                 setTimeLeft(remaining);
            }
        } else {
            setTimeLeft(gameState.config.timerDurationSeconds);
        }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.timerEndTime, gameState?.timerPausedRemaining]);

  if (loading || !gameState) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Carregant...</div>;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const lastMoveLabel = gameState.lastPlayedMove 
    ? `${ROW_LABELS[gameState.lastPlayedMove.row]}${COL_LABELS[gameState.lastPlayedMove.col]} ${gameState.lastPlayedMove.direction === 'H' ? '→' : '↓'}`
    : '';

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="grid grid-cols-[1fr_320px] gap-12 w-full max-w-7xl h-full">
            
            <div className="flex items-center justify-center bg-gray-800/50 rounded-3xl p-8 shadow-2xl border border-gray-700">
                <div className="scale-[1.15]">
                    <Board board={gameState.board} />
                </div>
            </div>

            <div className="flex flex-col gap-8">
                {/* Timer Box */}
                <div className={`
                    rounded-2xl p-6 text-center border shadow-lg transition-colors
                    ${gameState.status === RoundStatus.PLAYING && timeLeft < 30 ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 text-white'}
                `}>
                    <h2 className="text-gray-400 uppercase tracking-widest text-sm font-semibold mb-2">
                        {gameState.status === RoundStatus.PLAYING ? 'Temps Restant' : 'Preparant...'}
                    </h2>
                    <div className="text-7xl font-bold font-mono tabular-nums mb-2">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-xl text-blue-400 font-bold">Ronda {gameState.round}</div>
                </div>

                {/* Rack Box */}
                <div className="bg-[#fdf5e6] rounded-2xl p-6 shadow-xl border-4 border-[#8b5a2b]">
                    <h2 className="text-[#8b5a2b] uppercase tracking-widest text-sm font-bold mb-4 text-center border-b border-[#8b5a2b]/20 pb-2">
                        Lletres Disponibles
                    </h2>
                    <div className="flex gap-2 justify-center overflow-x-auto py-2">
                        {(gameState.currentRack || []).map((c, i) => (
                            <Tile key={i} tile={createTile(c)} size="lg" className="shadow-lg shrink-0" />
                        ))}
                    </div>
                </div>

                {/* Previous Move Box */}
                {gameState.lastPlayedMove && (
                    <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-6 text-center">
                        <div className="text-green-400 text-xs uppercase mb-1">Última Jugada Mestra</div>
                        <div className="text-3xl font-bold text-white mb-1">{gameState.lastPlayedMove.word.toUpperCase()}</div>
                        <div className="flex justify-between items-center mt-2 px-4">
                            <span className="text-green-300 font-mono font-bold">{lastMoveLabel}</span>
                            <span className="text-green-300 font-mono text-xl font-bold">{gameState.lastPlayedMove.score} pts</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ProjectorView;
