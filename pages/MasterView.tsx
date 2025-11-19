
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { GameState, PlayerMove, RoundStatus } from '../types';
import { getGameState, updateRack, refillRack, openRound, closeRound, finalizeRound } from '../services/gameService';
import { calculateMoveScore, parseInputWord, createTile, calculateRemainingBag } from '../utils/scrabbleUtils';
import Board from '../components/Board';
import { COL_LABELS, ROW_LABELS } from '../constants';
import Tile from '../components/Tile';

// Extend PlayerMove to include properties calculated during review
type ProcessedMove = PlayerMove & {
  calculatedScore: number;
  valid: boolean;
  error?: string;
};

const MasterView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(getGameState());
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [previewMove, setPreviewMove] = useState<ProcessedMove | null>(null);
  
  // Rack Editing
  const [rackInput, setRackInput] = useState('');
  const [isEditingRack, setIsEditingRack] = useState(false);
  const [bagCount, setBagCount] = useState(0);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(gameState.config.timerDurationSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // View Mode State
  const [viewHistoryMode, setViewHistoryMode] = useState(false);

  // Sync State
  useEffect(() => {
    const handleStorage = () => {
        const newState = getGameState();
        setGameState(newState);
        // Only sync rack input if we are NOT editing it
        if (!isEditingRack && newState.status === RoundStatus.IDLE) {
             setRackInput(newState.currentRack.map(c => createTile(c).displayChar).join(''));
        }
    };
    
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
        const newState = getGameState();
        setGameState(newState);
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [isEditingRack]);

  // Reset local selection when round changes
  useEffect(() => {
      if (gameState.status === RoundStatus.IDLE) {
          setSelectedCandidateId(null);
          setPreviewMove(null);
      }
  }, [gameState.round, gameState.status]);

  // Bag Calculation
  useEffect(() => {
      const remaining = calculateRemainingBag(gameState.board, gameState.currentRack);
      setBagCount(remaining.length);
  }, [gameState.board, gameState.currentRack]);

  // Initial Sync for Rack Input
  useEffect(() => {
      if (gameState.status === RoundStatus.IDLE && !isEditingRack && rackInput === '') {
          setRackInput(gameState.currentRack.map(c => createTile(c).displayChar).join(''));
      }
  }, [gameState.currentRack, gameState.status]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeLeft > 0) {
        interval = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
    } else if (timeLeft === 0) {
        setIsTimerRunning(false);
        setTimerFinished(true);
        if (gameState.status === RoundStatus.PLAYING) {
            playBeep(1.5, 600, 'square');
        }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, gameState.status]);

  const playBeep = (duration: number, frequency: number, type: OscillatorType = 'sine') => {
    try {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.error("Audio play failed", e);
    }
  };

  useEffect(() => {
      if (isTimerRunning && timeLeft === 30) {
          playBeep(0.5, 440); 
      }
  }, [timeLeft, isTimerRunning]);

  // --- Action Handlers ---

  const handleOpenRound = () => {
      openRound();
      setIsTimerRunning(true);
      setTimeLeft(gameState.config.timerDurationSeconds);
      setTimerFinished(false);
  };

  const handleCloseRound = () => {
      closeRound();
      setIsTimerRunning(false);
  };

  const toggleTimer = () => {
      if (timeLeft === 0) return; 
      setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
      setIsTimerRunning(false);
      setTimeLeft(gameState.config.timerDurationSeconds);
      setTimerFinished(false);
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Game Logic ---

  const processedMoves: ProcessedMove[] = gameState.moves.map(m => {
      const result = calculateMoveScore(
          gameState.board,
          m.tiles,
          gameState.currentRack,
          m.row,
          m.col,
          m.direction
      );
      return { ...m, calculatedScore: result.score, valid: result.isValid, error: result.error };
  }).sort((a, b) => b.calculatedScore - a.calculatedScore);

  // Handle click on row (Preview)
  const handlePreview = (move: ProcessedMove) => {
      setPreviewMove(move);
  };

  // Handle Radio Button Selection
  const handleSelectCandidate = (e: React.MouseEvent, move: ProcessedMove) => {
      e.stopPropagation();
      if (move.valid) {
          setSelectedCandidateId(move.id);
          setPreviewMove(move); 
      }
  };

  // Finalize Round Action
  const handleApplyAndNextRound = () => {
      const candidate = processedMoves.find(m => m.id === selectedCandidateId);
      if (!candidate) return;

      if (window.confirm(`Confirmar "${candidate.word}" (${candidate.calculatedScore} pts) i passar de ronda?`)) {
          // Finalize moves logic (Board update, Score update, Rack clean)
          finalizeRound({ ...candidate, score: candidate.calculatedScore || 0, isMasterMove: true }, processedMoves);
          
          // FORCE immediate Update of local state to reflect changes instantly
          setGameState(getGameState());
          
          resetTimer();
          setRackInput('');
          setPreviewMove(null);
          setSelectedCandidateId(null);
      }
  };

  const handleRefillRack = () => {
      refillRack();
      const state = getGameState();
      setRackInput(state.currentRack.map(c => createTile(c).displayChar).join(''));
  };

  const handleRackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toUpperCase();
      setRackInput(val);
      setIsEditingRack(true);
  };

  const handleRackSubmit = () => {
      setIsEditingRack(false);
      if (rackInput.trim() === '') {
          updateRack([]);
          return;
      }
      const tiles = parseInputWord(rackInput);
      updateRack(tiles.map(t => t.char));
  };

  // --- Visual Helpers ---

  const getPreviewTiles = () => {
      if (!previewMove) return [];
      return previewMove.tiles.map((t, i) => ({
          tile: t,
          row: previewMove.direction === 'H' ? previewMove.row : previewMove.row + i,
          col: previewMove.direction === 'H' ? previewMove.col + i : previewMove.col
      }));
  };

  const getUsedRackIndices = () => {
      if (!previewMove) return [];
      const indices: number[] = [];
      const rackCopy = [...gameState.currentRack]; 
      const { row, col, direction, tiles } = previewMove;
      
      tiles.forEach((tile, i) => {
          const r = direction === 'H' ? row : row + i;
          const c = direction === 'H' ? col + i : col;
          const existingCell = gameState.board[r]?.[c];
          if (!existingCell?.tile) {
              const charToFind = tile.char.toUpperCase();
              let rackIdx = -1;
              for(let k=0; k<rackCopy.length; k++) {
                   if (rackCopy[k] === charToFind && !indices.includes(k)) {
                       rackIdx = k;
                       break;
                   }
              }
              if (rackIdx === -1) {
                   for(let k=0; k<rackCopy.length; k++) {
                       if (rackCopy[k] === '?' && !indices.includes(k)) {
                           rackIdx = k;
                           break;
                       }
                   }
              }
              if (rackIdx !== -1) indices.push(rackIdx);
          }
      });
      return indices;
  };

  const usedRackIndices = getUsedRackIndices();

  const sortedRanking = Object.entries(gameState.playerScores)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const selectedCandidate = processedMoves.find(m => m.id === selectedCandidateId);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col h-screen overflow-hidden">
      
      {/* --- Header --- */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center shadow-sm z-10 h-16 shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </Link>
            <div className="flex flex-col leading-none">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm w-fit">
                        Ronda {gameState.round}
                    </div>
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider
                        ${gameState.status === RoundStatus.IDLE ? 'bg-gray-100 text-gray-500 border-gray-300' : ''}
                        ${gameState.status === RoundStatus.PLAYING ? 'bg-green-100 text-green-600 border-green-300 animate-pulse' : ''}
                        ${gameState.status === RoundStatus.REVIEW ? 'bg-amber-100 text-amber-600 border-amber-300' : ''}
                    `}>
                        {gameState.status === RoundStatus.IDLE && 'PREPARACIÓ'}
                        {gameState.status === RoundStatus.PLAYING && 'EN JOC'}
                        {gameState.status === RoundStatus.REVIEW && 'REVISIÓ'}
                    </div>
                </div>
            </div>
            
            {/* Last Move Display */}
            {gameState.lastPlayedMove && gameState.lastPlayedMove.roundNumber === (gameState.round - 1) && (
                <div className="hidden md:flex items-center gap-2 text-sm bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1 rounded-lg ml-4">
                    <span className="text-xs uppercase opacity-50">Anterior:</span>
                    <span className="font-mono font-bold">{gameState.lastPlayedMove.word.toUpperCase()}</span>
                    <span className="bg-gray-200 px-1 rounded text-xs">{gameState.lastPlayedMove.score}</span>
                </div>
            )}
          </div>

          {/* --- Control Center --- */}
          <div className="flex items-center gap-4">
              
              {/* IDLE Actions */}
              {gameState.status === RoundStatus.IDLE && (
                  <button onClick={handleOpenRound} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow font-bold animate-bounce-subtle text-sm">
                      ▶ OBRIR RONDA
                  </button>
              )}

              {/* PLAYING Actions */}
              {gameState.status === RoundStatus.PLAYING && (
                  <button onClick={handleCloseRound} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded shadow font-bold text-sm">
                      ⏹ TANCAR RONDA
                  </button>
              )}

              {/* REVIEW Actions */}
              {gameState.status === RoundStatus.REVIEW && (
                   <button 
                        onClick={handleApplyAndNextRound} 
                        disabled={!selectedCandidateId}
                        className={`px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2 transition-all
                            ${selectedCandidateId 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                        `}
                   >
                      {selectedCandidateId 
                        ? `APLICAR "${selectedCandidate?.word}" I NOVA RONDA ⏭`
                        : 'SELECCIONA JUGADA MESTRA'
                      }
                   </button>
              )}

              <div className="h-8 w-px bg-gray-300 mx-2"></div>

              {/* Timer */}
              <div 
                className={`
                    relative flex items-center justify-center w-24 h-10 rounded-md border-2 font-mono text-xl font-bold cursor-pointer select-none transition-colors shadow-inner
                    ${timerFinished ? 'bg-red-100 border-red-500 text-red-600' : 
                      isTimerRunning ? 'bg-white border-green-500 text-green-600' : 'bg-gray-50 border-gray-300 text-gray-400'}
                `}
                onClick={toggleTimer}
                onDoubleClick={resetTimer}
              >
                  {formatTime(timeLeft)}
              </div>

              <Link to="/settings" className="text-gray-400 hover:text-gray-600">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </Link>
          </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex flex-grow overflow-hidden">
          
          {/* Left Column: Board & Rack */}
          <div className="w-7/12 bg-gray-200 p-4 flex flex-col items-center overflow-y-auto border-r border-gray-300">
             
             {/* Board */}
             <div className="bg-white p-2 rounded-lg shadow-2xl mb-6 scale-95 origin-top">
                 <Board board={gameState.board} previewTiles={getPreviewTiles()} />
             </div>
             
             {/* Rack Manager */}
             <div className="bg-white p-5 rounded-xl shadow-lg w-full max-w-2xl relative border border-gray-200">
                <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-700 text-base uppercase tracking-wide">Faristol</h3>
                        {gameState.status !== RoundStatus.IDLE && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">Bloquejat</span>
                        )}
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">
                        Sac: {bagCount} fitxes
                    </span>
                </div>
                <div className="flex gap-2 justify-center flex-wrap mb-4 min-h-[3.5rem] bg-[#f8f4eb] p-3 rounded-lg border-inner shadow-inner">
                    {gameState.currentRack.map((c, i) => {
                        const isUsed = usedRackIndices.includes(i);
                        return (
                            <Tile 
                                key={i} 
                                tile={createTile(c)} 
                                size="md" 
                                className={`transition-all duration-300 ${isUsed ? 'opacity-20 grayscale scale-90 blur-[1px]' : 'hover:scale-105'}`}
                            />
                        );
                    })}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                         <input 
                            type="text" 
                            value={rackInput}
                            onChange={handleRackChange}
                            onBlur={handleRackSubmit}
                            onKeyDown={(e) => e.key === 'Enter' && handleRackSubmit()}
                            disabled={gameState.status !== RoundStatus.IDLE}
                            placeholder="Escriu lletres..."
                            className="w-full p-3 pl-4 border-2 border-gray-200 rounded-lg font-mono font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none disabled:bg-gray-50 disabled:text-gray-400 transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleRefillRack}
                        disabled={gameState.status !== RoundStatus.IDLE}
                        className="bg-indigo-100 text-indigo-700 p-3 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
                    >
                        <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </button>
                </div>
             </div>
          </div>

          {/* Right Column: Moves & Ranking */}
          <div className="w-5/12 bg-white flex flex-col border-l border-gray-200 shadow-xl z-20">
              <div className="flex border-b">
                  <button 
                    className={`flex-1 py-3 font-bold text-sm uppercase tracking-wide ${!viewHistoryMode ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => setViewHistoryMode(false)}
                  >
                    Respostes ({processedMoves.length})
                  </button>
                  <button 
                    className={`flex-1 py-3 font-bold text-sm uppercase tracking-wide ${viewHistoryMode ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => setViewHistoryMode(true)}
                  >
                    Classificació
                  </button>
              </div>

              <div className="flex-grow overflow-y-auto p-0">
                  {!viewHistoryMode ? (
                      <>
                        {gameState.status === RoundStatus.IDLE && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                <span className="text-4xl mb-2">⏳</span>
                                <p>Prepara el faristol i obre la ronda.</p>
                            </div>
                        )}
                        
                        {gameState.status === RoundStatus.PLAYING && processedMoves.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                <span className="text-4xl mb-2 animate-bounce">📡</span>
                                <p>Esperant jugades...</p>
                            </div>
                        )}

                        <div className="divide-y divide-gray-100">
                             {processedMoves.map((move) => {
                                 const isSelected = selectedCandidateId === move.id;
                                 const isPreview = previewMove?.id === move.id;

                                 return (
                                     <div 
                                        key={move.id}
                                        onClick={() => handlePreview(move)}
                                        className={`
                                            p-3 cursor-pointer transition-all flex gap-3 items-start
                                            ${isPreview ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                                            ${isSelected ? 'bg-green-50' : ''}
                                        `}
                                     >
                                        {/* Radio Button Selection (Only in Review) */}
                                        {gameState.status === RoundStatus.REVIEW && (
                                            <div className="pt-1">
                                                <button
                                                    onClick={(e) => handleSelectCandidate(e, move)}
                                                    disabled={!move.valid}
                                                    className={`
                                                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                                                        ${isSelected ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}
                                                        ${!move.valid ? 'opacity-30 cursor-not-allowed' : ''}
                                                    `}
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{move.playerName}</span>
                                                        {!move.valid && <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded">⚠ INVÀLID</span>}
                                                        {isSelected && <span className="text-[10px] text-green-600 bg-green-100 px-2 rounded-full font-bold">MESTRA</span>}
                                                    </div>
                                                    <div className="font-mono text-lg leading-none mt-1 text-slate-600">
                                                        {move.tiles.map((t, i) => (
                                                            <span key={i} className={t.isBlank ? 'lowercase text-blue-600 font-bold' : ''}>{t.displayChar}</span>
                                                        ))}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                                        <span>{COL_LABELS[move.col]}{ROW_LABELS[move.row]} {move.direction === 'H' ? '→' : '↓'}</span>
                                                        <span>• {new Date(move.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-xl font-bold ${move.valid ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                        {move.calculatedScore}
                                                    </div>
                                                </div>
                                            </div>
                                            {isPreview && !move.valid && (
                                                <div className="text-xs text-red-500 mt-1 bg-red-50 p-1 rounded">
                                                    Error: {move.error}
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                 );
                             })}
                        </div>
                      </>
                  ) : (
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                              <tr>
                                  <th className="p-3">Pos</th>
                                  <th className="p-3">Jugador</th>
                                  <th className="p-3 text-right">Total</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {sortedRanking.map(([name, score], idx) => (
                                  <tr key={name} className="hover:bg-gray-50">
                                      <td className="p-3 text-gray-400 font-mono w-12">{idx + 1}</td>
                                      <td className="p-3 font-bold text-slate-700">{name}</td>
                                      <td className="p-3 text-right font-mono font-bold text-indigo-600">{score}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default MasterView;
