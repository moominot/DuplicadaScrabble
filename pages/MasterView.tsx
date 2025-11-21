
import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { PlayerMove, RoundStatus, Participant } from '../types';
import { COL_LABELS, ROW_LABELS } from '../constants';
import { updateRack, refillRack, openRound, closeRound, finalizeRound, toggleTimer, resetTimer } from '../services/gameService';
import { calculateMoveScore, parseInputWord, createTile, calculateRemainingBag } from '../utils/scrabbleUtils';
import Board from '../components/Board';
import Tile from '../components/Tile';
import { useGame } from '../hooks/useGame';

type ProcessedMove = PlayerMove & {
  calculatedScore: number;
  valid: boolean;
  error?: string;
};

const MasterView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const navigate = useNavigate();
  
  const { gameState, loading, error } = useGame(gameId);
  
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [previewMove, setPreviewMove] = useState<ProcessedMove | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  
  const [rackInput, setRackInput] = useState('');
  const [isEditingRack, setIsEditingRack] = useState(false);
  const [bagCount, setBagCount] = useState(0);

  const [timeLeft, setTimeLeft] = useState(180); 
  const [timerFinished, setTimerFinished] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Navigation State
  const [viewingRound, setViewingRound] = useState<number>(0);
  const [viewHistoryMode, setViewHistoryMode] = useState(false); // Toggle between List/Ranking
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
      if(!gameId) navigate('/');
  }, [gameId, navigate]);

  // Initialize viewingRound to current round when loaded
  useEffect(() => {
      if (gameState && viewingRound === 0) {
          setViewingRound(gameState.round);
      } else if (gameState && gameState.round !== viewingRound && viewingRound > gameState.round) {
          setViewingRound(gameState.round);
      } else if (gameState && gameState.status === RoundStatus.IDLE && viewingRound < gameState.round) {
          setViewingRound(gameState.round);
      }
  }, [gameState?.round, gameState?.status]);

  useEffect(() => {
      if(gameState) {
          const remaining = calculateRemainingBag(gameState.board, (gameState.currentRack || []));
          setBagCount(remaining.length);
      }
  }, [gameState]);

  useEffect(() => {
      if (gameState && gameState.status === RoundStatus.IDLE && !isEditingRack && rackInput === '') {
          setRackInput((gameState.currentRack || []).map(c => createTile(c).displayChar).join(''));
      }
  }, [gameState, isEditingRack]);

  useEffect(() => {
      if(gameState && gameState.status === RoundStatus.IDLE) {
          setSelectedCandidateId(null);
          setPreviewMove(null);
          setIsApplying(false);
          setShowConfirmModal(false);
      }
  }, [gameState?.round, gameState?.status]);

  // --- SYNCED TIMER LOGIC ---
  useEffect(() => {
    if (!gameState) return;

    const updateTimer = () => {
        const now = Date.now();
        
        if (gameState.status === RoundStatus.PLAYING) {
            if (gameState.timerPausedRemaining !== null && gameState.timerPausedRemaining !== undefined) {
                 setTimeLeft(Math.ceil(gameState.timerPausedRemaining / 1000));
            } else if (gameState.timerEndTime) {
                 const remainingMs = gameState.timerEndTime - now;
                 const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
                 
                 setTimeLeft(remainingSec);

                 if (remainingSec === 0 && !timerFinished) {
                     setTimerFinished(true);
                     playBeep(1.5, 600, 'square'); 
                     handleCloseRound();
                 } else if (remainingSec > 0) {
                     setTimerFinished(false);
                 }
                 
                 if (remainingSec === 30) playBeep(0.5, 440);
            }
        } else {
            setTimeLeft(gameState.config.timerDurationSeconds);
            setTimerFinished(false);
        }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.timerEndTime, gameState?.timerPausedRemaining, gameState?.config]);


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

  // --- Action Handlers ---

  const handleOpenRound = async () => {
      if(!gameId) return;
      try {
        await openRound(gameId);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleCloseRound = async () => {
      if(!gameId) return;
      await closeRound(gameId);
  };

  const handleToggleTimer = async () => {
      if(!gameId) return;
      await toggleTimer(gameId);
  };

  const handleResetTimer = async () => {
      if(!gameId) return;
      await resetTimer(gameId);
  };

  const handlePrevRound = () => {
      if (viewingRound > 1) setViewingRound(viewingRound - 1);
  };
  
  const handleNextRound = () => {
      if (gameState && viewingRound < gameState.round) setViewingRound(viewingRound + 1);
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCoordsLabel = (row: number, col: number, dir: string) => {
      const rLabel = ROW_LABELS[row];
      const cLabel = COL_LABELS[col];
      return `${rLabel}${cLabel} ${dir === 'H' ? '→' : '↓'}`;
  }

  // --- Data Preparation (History vs Current) ---

  if (loading) return <div className="flex h-screen items-center justify-center text-2xl text-gray-400">Carregant...</div>;
  if (error || !gameState) return <div className="flex h-screen items-center justify-center text-red-500">Error</div>;

  const isHistoryView = viewingRound < gameState.round;
  const historyItem = isHistoryView ? gameState.history.find(h => h.roundNumber === viewingRound) : null;

  const displayBoard = isHistoryView && historyItem ? historyItem.boardSnapshot : gameState.board;
  const displayRack = isHistoryView && historyItem ? historyItem.rack : gameState.currentRack;
  
  // --- MOVES LOGIC: Switch between live moves or historical moves ---
  let processedMoves: ProcessedMove[] = [];

  if (isHistoryView && historyItem && historyItem.moves) {
      // In history mode, simply take the saved moves (they are already processed with scores)
      processedMoves = historyItem.moves.map(m => ({
          ...m,
          calculatedScore: m.score || 0, // Use stored score
          // FIX: Llegir 'valid' (com es guardava abans) o 'isValid' (com es guardarà ara)
          valid: (m as any).valid ?? m.isValid ?? false, 
          error: m.error
      }));
  } else if (!isHistoryView) {
      // In current mode, calculate scores on the fly for preview
      const currentMoves = gameState.moves || [];
      const roundEndTime = (gameState.roundStartTime || 0) + (gameState.config.timerDurationSeconds * 1000);
      const gracePeriod = (gameState.config.gracePeriodSeconds || 10) * 1000;

      processedMoves = currentMoves.map(m => {
          // 1. Calculate Board Validity & Score
          const result = calculateMoveScore(
              gameState.board,
              m.tiles,
              gameState.currentRack || [],
              m.row,
              m.col,
              m.direction
          );

          // 2. Check Timestamp Validity (Real-time)
          const isLate = (gameState.roundStartTime && m.timestamp > (roundEndTime + gracePeriod));
          
          if (isLate) {
              result.isValid = false;
              result.score = 0;
              result.error = "Fora de temps";
          }

          return { 
              ...m, 
              calculatedScore: result.score, 
              valid: result.isValid, 
              error: result.error 
          };
      });
  }

  processedMoves.sort((a, b) => b.calculatedScore - a.calculatedScore);

  const handlePreview = (move: ProcessedMove) => {
      if (isHistoryView) return;
      setPreviewMove(move);
  };

  const handleSelectCandidate = (e: React.MouseEvent, move: ProcessedMove) => {
      e.stopPropagation();
      if (isHistoryView) return;
      if (move.valid) {
          setSelectedCandidateId(move.id);
          setPreviewMove(move); 
      }
  };

  const executeApplyRound = async () => {
      const candidate = processedMoves.find(m => m.id === selectedCandidateId);
      if (!candidate || !gameId) return;
      setIsApplying(true);
      setShowConfirmModal(false);
      try {
        const masterMovePayload: PlayerMove = {
            id: candidate.id,
            playerId: candidate.playerId,
            playerName: candidate.playerName,
            tableNumber: candidate.tableNumber,
            word: candidate.word,
            tiles: candidate.tiles,
            row: candidate.row,
            col: candidate.col,
            direction: candidate.direction,
            timestamp: candidate.timestamp,
            roundNumber: candidate.roundNumber,
            isMasterMove: true
        };

        await finalizeRound(gameId, masterMovePayload);
        setSelectedCandidateId(null);
        setPreviewMove(null);
        setRackInput('');
      } catch (err: any) {
          console.error(err);
          alert(`Error: ${err.message}`); 
      } finally {
          setIsApplying(false);
      }
  };

  const handleRefillRack = async () => {
      if(!gameId || isHistoryView) return;
      await refillRack(gameId);
  };

  const handleRackSubmit = async () => {
      setIsEditingRack(false);
      if(!gameId || isHistoryView) return;
      if (rackInput.trim() === '') {
          await updateRack(gameId, []);
          return;
      }
      const tiles = parseInputWord(rackInput);
      await updateRack(gameId, tiles.map(t => t.char));
  };

  const getPreviewTiles = () => {
      if (!previewMove || isHistoryView) return [];
      return previewMove.tiles.map((t, i) => ({
          tile: t,
          row: previewMove.direction === 'H' ? previewMove.row : previewMove.row + i,
          col: previewMove.direction === 'H' ? previewMove.col + i : previewMove.col
      }));
  };

  // --- RANKING LOGIC: Use snapshot for history, live for current ---
  const participantsSource = (isHistoryView && historyItem && historyItem.playerScoresSnapshot) 
        ? historyItem.playerScoresSnapshot 
        : gameState.participants;

  const participantsList = Object.values(participantsSource || {}) as Participant[];
  const sortedRanking = participantsList.sort((a, b) => b.totalScore - a.totalScore);
  
  const selectedCandidate = processedMoves.find(m => m.id === selectedCandidateId);

  return (
    // ROOT CONTAINER: Fixed height (h-screen) but Flex column
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      
      {/* --- Header (Fixed, Shrink-0) --- */}
      <div className="bg-white border-b px-2 md:px-4 py-2 flex flex-wrap md:flex-nowrap justify-between items-center shadow-sm z-10 shrink-0 gap-2 h-auto min-h-[4rem]">
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <Link to="/" className="text-gray-400 hover:text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </Link>
            
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                 <button onClick={handlePrevRound} disabled={viewingRound <= 1} className="p-1 hover:bg-white rounded disabled:opacity-30">◀</button>
                 <div className="px-2 font-bold text-xs md:text-sm whitespace-nowrap">
                     R {viewingRound}
                     {isHistoryView && <span className="ml-1 text-[9px] bg-gray-300 px-1 rounded text-gray-700">HIST</span>}
                 </div>
                 <button onClick={handleNextRound} disabled={viewingRound >= gameState.round} className="p-1 hover:bg-white rounded disabled:opacity-30">▶</button>
            </div>

            {!isHistoryView && (
                 <div className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider whitespace-nowrap
                    ${gameState.status === RoundStatus.IDLE ? 'bg-gray-100 text-gray-500' : ''}
                    ${gameState.status === RoundStatus.PLAYING ? 'bg-green-100 text-green-600 animate-pulse' : ''}
                    ${gameState.status === RoundStatus.REVIEW ? 'bg-amber-100 text-amber-600' : ''}
                `}>
                    {gameState.status === RoundStatus.IDLE && 'PREPARACIÓ'}
                    {gameState.status === RoundStatus.PLAYING && 'EN JOC'}
                    {gameState.status === RoundStatus.REVIEW && 'REVISIÓ'}
                </div>
            )}
          </div>

          {/* --- Control Center --- */}
          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
              
              {!isHistoryView && (
                  <>
                    {gameState.status === RoundStatus.IDLE && (
                        <button 
                            onClick={handleOpenRound} 
                            disabled={bagCount > 0 && (gameState.currentRack || []).length < 7}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 md:px-6 md:py-2 rounded shadow font-bold text-xs md:text-sm transition-colors whitespace-nowrap"
                        >
                            ▶ OBRIR
                        </button>
                    )}

                    {gameState.status === RoundStatus.PLAYING && (
                        <button onClick={handleCloseRound} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 md:px-6 md:py-2 rounded shadow font-bold text-xs md:text-sm whitespace-nowrap">
                            ⏹ TANCAR
                        </button>
                    )}

                    {gameState.status === RoundStatus.REVIEW && (
                        <button 
                                onClick={() => selectedCandidateId && setShowConfirmModal(true)} 
                                disabled={!selectedCandidateId || isApplying}
                                className={`px-3 py-1 md:px-4 md:py-2 rounded shadow text-xs md:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap
                                    ${selectedCandidateId 
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                                `}
                        >
                            {isApplying ? '...' : selectedCandidateId ? `APLICAR` : 'SELECCIONA'}
                        </button>
                    )}
                  </>
              )}

              {/* Timer */}
              <div 
                onClick={handleToggleTimer}
                onDoubleClick={handleResetTimer}
                className={`
                    relative flex items-center justify-center w-16 h-8 md:w-24 md:h-10 rounded-md border-2 font-mono text-lg md:text-xl font-bold select-none transition-colors shadow-inner cursor-pointer
                    ${timerFinished ? 'bg-red-100 border-red-500 text-red-600' : 
                      gameState.status === RoundStatus.PLAYING ? 'bg-white border-green-500 text-green-600' : 'bg-gray-50 border-gray-300 text-gray-400'}
                `}
              >
                  {formatTime(timeLeft)}
              </div>

              <Link to={`/settings?gameId=${gameId}`} className="text-gray-400 hover:text-gray-600">⚙</Link>
          </div>
      </div>

      {/* --- Main Content (SCROLLABLE ON MOBILE) --- 
          Critical Fix: overflow-y-auto allows the column stack to scroll on mobile.
          lg:overflow-hidden locks it on desktop for split-pane scrolling.
      */}
      <div className="flex flex-col lg:flex-row flex-grow overflow-y-auto lg:overflow-hidden">
          
          {/* Left Column: Board & Rack */}
          <div className="w-full lg:w-7/12 bg-gray-200 p-2 md:p-4 flex flex-col items-center border-r border-gray-300 shrink-0">
             
             {/* Board Container */}
             <div className="bg-white p-1 md:p-2 rounded-lg shadow-2xl mb-2 md:mb-6 flex justify-center w-full max-w-2xl mx-auto">
                 <div className="w-full">
                     <Board board={displayBoard} previewTiles={getPreviewTiles()} />
                 </div>
             </div>
             
             <div className="bg-white p-2 md:p-5 rounded-xl shadow-lg w-full max-w-2xl relative border border-gray-200 mt-auto md:mt-0">
                <div className="flex justify-between items-end mb-1 md:mb-3">
                    <h3 className="font-bold text-gray-700 text-xs md:text-base uppercase tracking-wide">
                        Faristol
                    </h3>
                    <span className="text-[10px] md:text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">
                        Sac: {bagCount}
                    </span>
                </div>
                <div className="flex gap-1 md:gap-2 justify-center flex-wrap mb-2 md:mb-4 min-h-[3rem] bg-[#f8f4eb] p-2 rounded-lg border-inner shadow-inner">
                    {(displayRack || []).map((c, i) => (
                         <Tile key={i} tile={createTile(c)} size="md" className={isHistoryView ? 'opacity-70' : ''} />
                    ))}
                </div>
                {!isHistoryView && (
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={rackInput}
                            onChange={(e) => { setRackInput(e.target.value.toUpperCase()); setIsEditingRack(true); }}
                            onBlur={handleRackSubmit}
                            onKeyDown={(e) => e.key === 'Enter' && handleRackSubmit()}
                            disabled={gameState.status !== RoundStatus.IDLE}
                            placeholder="LLETRES..."
                            className="w-full p-2 md:p-3 pl-4 border-2 border-gray-200 rounded-lg font-mono font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none disabled:bg-gray-50 text-sm md:text-base"
                        />
                        <button 
                            onClick={handleRefillRack}
                            disabled={gameState.status !== RoundStatus.IDLE}
                            className="bg-indigo-100 text-indigo-700 p-2 md:p-3 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                        >
                            🔄
                        </button>
                    </div>
                )}
             </div>
          </div>

          {/* Right Column: Moves & Ranking 
              Mobile: h-auto (expands naturally, page scrolls).
              Desktop: h-full (fits in split pane), internal scroll.
          */}
          <div className="w-full lg:w-5/12 bg-white flex flex-col border-l border-gray-200 shadow-xl z-20 h-auto lg:h-full">
              <div className="flex border-b shrink-0 bg-white sticky top-0 z-30">
                  <button 
                    className={`flex-1 py-3 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wide ${!viewHistoryMode ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500'}`}
                    onClick={() => setViewHistoryMode(false)}
                  >
                    {isHistoryView ? `Respostes Històric (${processedMoves.length})` : `Respostes (${processedMoves.length})`}
                  </button>
                  <button 
                    className={`flex-1 py-3 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wide ${viewHistoryMode ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500'}`}
                    onClick={() => setViewHistoryMode(true)}
                  >
                    Classificació {isHistoryView ? '(Hist)' : ''}
                  </button>
              </div>

              {/* List Container:
                  Mobile: Overflow visible (use page scroll).
                  Desktop: Overflow auto (use internal scroll).
              */}
              <div className="flex-grow overflow-visible lg:overflow-y-auto p-0 min-h-[400px]">
                  {(!viewHistoryMode) ? (
                      <div className="divide-y divide-gray-100 pb-20 lg:pb-0">
                             {processedMoves.length === 0 && <div className="p-4 text-center text-gray-400 italic">Cap resposta disponible.</div>}
                             {processedMoves.map((move) => {
                                 const isSelected = selectedCandidateId === move.id;
                                 const isPreview = previewMove?.id === move.id;
                                 const coordsLabel = getCoordsLabel(move.row, move.col, move.direction);

                                 return (
                                     <div 
                                        key={move.id}
                                        onClick={() => handlePreview(move)}
                                        className={`
                                            p-2 md:p-3 cursor-pointer transition-all flex gap-2 items-start
                                            ${isPreview ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                                            ${isSelected ? 'bg-green-50' : ''}
                                        `}
                                     >
                                        {gameState.status === RoundStatus.REVIEW && !isHistoryView && (
                                            <div className="pt-1">
                                                <div
                                                    onClick={(e) => handleSelectCandidate(e, move)}
                                                    className={`
                                                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                                                        ${isSelected ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}
                                                        ${!move.valid ? 'opacity-30 cursor-not-allowed' : ''}
                                                    `}
                                                >
                                                    ✓
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] md:text-xs bg-gray-200 text-gray-600 px-1.5 rounded font-bold">#{move.tableNumber}</span>
                                                        <span className="text-xs md:text-sm font-bold text-slate-800">{move.playerName}</span>
                                                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1 rounded border">{coordsLabel}</span>
                                                        {!move.valid && <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded">⚠ INVÀLID</span>}
                                                    </div>
                                                    {/* Mostrar motiu de l'error si n'hi ha */}
                                                    {move.error && (
                                                        <div className="text-[10px] text-red-500 font-bold mt-0.5">
                                                            {move.error}
                                                        </div>
                                                    )}
                                                    <div className="font-mono text-base md:text-lg leading-none mt-1 text-slate-600">
                                                        {move.tiles.map((t, i) => (
                                                            <span key={i} className={t.isBlank ? 'lowercase text-blue-600 font-bold' : ''}>{t.displayChar}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg md:text-xl font-bold ${move.valid ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                        {move.calculatedScore}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                     </div>
                                 );
                             })}
                        </div>
                  ) : (
                      <table className="w-full text-left mb-20 lg:mb-0">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                              <tr>
                                  <th className="p-2 md:p-3">Pos</th>
                                  <th className="p-2 md:p-3">Taula</th>
                                  <th className="p-2 md:p-3">Jugador</th>
                                  <th className="p-2 md:p-3 text-right">Total</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {sortedRanking.map((participant, idx) => (
                                  <tr key={participant.id} className="hover:bg-gray-50 text-xs md:text-sm">
                                      <td className="p-2 md:p-3 text-gray-400 font-mono w-8">{idx + 1}</td>
                                      <td className="p-2 md:p-3 font-bold text-gray-500">#{participant.tableNumber}</td>
                                      <td className="p-2 md:p-3 font-bold text-slate-700">{participant.name}</td>
                                      <td className="p-2 md:p-3 text-right font-mono font-bold text-indigo-600">{participant.totalScore}</td>
                                  </tr>
                              ))}
                              {sortedRanking.length === 0 && (
                                  <tr><td colSpan={4} className="p-4 text-center text-gray-400">No hi ha dades encara.</td></tr>
                              )}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold mb-2 text-gray-800">Confirmar Jugada Mestra</h3>
                <div className="bg-gray-50 p-3 rounded border mb-4">
                    <div className="text-2xl font-black text-center mb-1 text-indigo-700 break-words">{selectedCandidate?.word}</div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Punts: <strong>{selectedCandidate?.calculatedScore}</strong></span>
                        <span>Taula: <strong>{selectedCandidate?.tableNumber}</strong></span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">Cancel·lar</button>
                    <button onClick={executeApplyRound} className="flex-1 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow">Confirmar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MasterView;
