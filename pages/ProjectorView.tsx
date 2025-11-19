import React, { useEffect, useState } from 'react';
import { getGameState } from '../services/gameService';
import { GameState } from '../types';
import Board from '../components/Board';
import Tile from '../components/Tile';

const ProjectorView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(getGameState());
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
        setGameState(getGameState());
        setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Parse current rack for display tiles (simple char creation)
  const rackTiles = gameState.currentRack.map(char => ({
      char,
      value: 0, // Value doesn't matter strictly for rack display here
      isBlank: false,
      displayChar: char
  }));

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="grid grid-cols-[1fr_300px] gap-12 w-full max-w-7xl h-full">
            
            {/* Board Area */}
            <div className="flex items-center justify-center bg-gray-800/50 rounded-3xl p-8 shadow-2xl border border-gray-700">
                <div className="scale-[1.15]">
                    <Board board={gameState.board} />
                </div>
            </div>

            {/* Info Sidebar */}
            <div className="flex flex-col gap-8">
                
                {/* Timer / Round */}
                <div className="bg-gray-800 rounded-2xl p-6 text-center border border-gray-700 shadow-lg">
                    <h2 className="text-gray-400 uppercase tracking-widest text-sm font-semibold mb-2">Ronda</h2>
                    <div className="text-6xl font-bold text-white font-mono mb-4">{gameState.round}</div>
                    <div className="h-px bg-gray-700 w-1/2 mx-auto mb-4"></div>
                    <div className="text-3xl text-blue-400 font-mono">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {/* Rack Display */}
                <div className="bg-[#fdf5e6] rounded-2xl p-6 shadow-xl border-4 border-[#8b5a2b]">
                    <h2 className="text-[#8b5a2b] uppercase tracking-widest text-sm font-bold mb-4 text-center border-b border-[#8b5a2b]/20 pb-2">
                        Lletres Disponibles
                    </h2>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {rackTiles.map((t, i) => (
                            <Tile key={i} tile={t} size="lg" className="shadow-lg" />
                        ))}
                    </div>
                </div>

                {/* Last Move Info */}
                {gameState.lastPlayedMove && (
                    <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-6 text-center">
                        <div className="text-green-400 text-xs uppercase mb-1">Última Jugada Mestra</div>
                        <div className="text-2xl font-bold text-white mb-1">{gameState.lastPlayedMove.word.toUpperCase()}</div>
                        <div className="text-green-300 font-mono text-xl">{gameState.lastPlayedMove.score} punts</div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default ProjectorView;