
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ROW_LABELS, COL_LABELS } from '../constants';
import { parseInputWord, getTileIndices } from '../utils/scrabbleUtils';
import { submitMove } from '../services/gameService';
import { Tile as TileType, RoundStatus } from '../types';
import Tile from '../components/Tile';
import { useGame } from '../hooks/useGame';

const PlayerView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const navigate = useNavigate();
  
  const { gameState, loading, error } = useGame(gameId);

  // Login State
  const [storedName, setStoredName] = useState(localStorage.getItem('scrabble_player_name') || '');
  const [storedTable, setStoredTable] = useState(localStorage.getItem('scrabble_table_num') || '');
  
  const [inputName, setInputName] = useState(storedName);
  const [inputTable, setInputTable] = useState(storedTable);
  const [isPlaying, setIsPlaying] = useState(!!storedName && !!storedTable);

  // Game State
  const [word, setWord] = useState('');
  const [col, setCol] = useState('H');
  const [row, setRow] = useState('8');
  const [direction, setDirection] = useState<'H' | 'V'>('H');
  const [submitted, setSubmitted] = useState(false);
  const [tilesPreview, setTilesPreview] = useState<TileType[]>([]);
  
  const [currentRound, setCurrentRound] = useState(1);

  useEffect(() => {
      if(!gameId) navigate('/');
  }, [gameId, navigate]);

  useEffect(() => {
      if (gameState) {
          setCurrentRound(gameState.round);
          // Reset form on new round
          if (gameState.round > currentRound) {
              setWord('');
              setSubmitted(false);
          }
      }
  }, [gameState, currentRound]);

  useEffect(() => {
      if (!word) {
          setTilesPreview([]);
          return;
      }
      const parsed = parseInputWord(word);
      setTilesPreview(parsed);
  }, [word]);

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputName.trim() && inputTable.trim()) {
          localStorage.setItem('scrabble_player_name', inputName.trim());
          localStorage.setItem('scrabble_table_num', inputTable.trim());
          setStoredName(inputName.trim());
          setStoredTable(inputTable.trim());
          setIsPlaying(true);
      }
  };

  const handleLogout = () => {
      setIsPlaying(false);
      localStorage.removeItem('scrabble_player_name');
      localStorage.removeItem('scrabble_table_num');
  };

  const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value.toUpperCase());
  };

  const handleTileClick = (index: number) => {
      const indices = getTileIndices(word);
      if (indices[index]) {
          const { start, end } = indices[index];
          const segment = word.substring(start, end);
          const isUpper = segment === segment.toUpperCase();
          const newSegment = isUpper ? segment.toLowerCase() : segment.toUpperCase();
          const newWord = word.substring(0, start) + newSegment + word.substring(end);
          setWord(newWord);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !storedName || !storedTable || !gameId || !gameState) return;

    const rIndex = ROW_LABELS.indexOf(row);
    const cIndex = COL_LABELS.indexOf(col);

    // Format Basic Validation only (length check)
    if (tilesPreview.length === 0) return;

    const playerId = `table_${storedTable}`; 

    await submitMove(gameId, {
      id: Date.now().toString(),
      playerId: playerId,
      playerName: storedName,
      tableNumber: storedTable,
      word: word,
      tiles: tilesPreview,
      row: rIndex,
      col: cIndex,
      direction,
      score: 0, // El servidor (master) calcularà la puntuació
      timestamp: Date.now(),
      roundNumber: currentRound
    });

    setSubmitted(true);
  };

  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6">
          <div className="text-center">
              <h2 className="text-3xl font-black text-slate-800 mb-2">BENVINGUT/DA</h2>
              <p className="text-slate-500">Introdueix les teves dades de joc.</p>
          </div>
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-2">Número de Taula</label>
                  <input
                    type="text"
                    placeholder="1, 2, 3..."
                    className="w-full p-4 border-2 border-slate-200 rounded-xl text-xl font-bold text-center focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
                    value={inputTable}
                    onChange={(e) => setInputTable(e.target.value)}
                    autoFocus
                    required
                  />
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-2">Nom del Jugador/a</label>
                  <input
                    type="text"
                    placeholder="EL TEU NOM"
                    className="w-full p-4 border-2 border-slate-200 rounded-xl text-xl font-bold uppercase focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value.toUpperCase())}
                    required
                  />
              </div>
          </div>
          <button 
            type="submit"
            disabled={!inputName.trim() || !inputTable.trim()}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:bg-indigo-700 shadow-lg disabled:opacity-50"
          >
            ENTRAR A LA PARTIDA
          </button>
        </form>
      </div>
    );
  }

  if (loading) return <div className="text-center p-10">Carregant...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  const isRoundOpen = gameState?.status === RoundStatus.PLAYING;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        
        <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-center min-w-[3rem]">
                  <span className="block text-[10px] uppercase font-bold text-indigo-400">Taula</span>
                  <span className="text-xl font-black text-indigo-700 leading-none">{storedTable}</span>
              </div>
              <div>
                  <div className="text-xs text-gray-500 font-bold uppercase">Jugador</div>
                  <div className="text-lg font-black text-slate-800 leading-none">{storedName}</div>
              </div>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg">SORTIR</button>
        </header>

        {/* Feedback d'estat de ronda */}
        {!isRoundOpen && (
            <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl text-center font-bold shadow-sm text-sm border border-yellow-200">
                ⚠ RONDA NO OBERTA (Pots preparar la jugada)
            </div>
        )}
        {isRoundOpen && (
            <div className="flex justify-between items-center bg-green-600 text-white p-3 rounded-xl shadow-md animate-pulse">
                 <span className="text-sm font-bold uppercase tracking-widest">RONDA EN JOC</span>
                 <div className="flex items-center gap-2 bg-green-700 px-3 py-1 rounded-lg">
                     <span className="font-black text-xl">#{currentRound}</span>
                 </div>
            </div>
        )}

        <form 
          onSubmit={handleSubmit} 
          className={`bg-white p-5 rounded-xl shadow-lg border border-gray-200 space-y-5 transition-opacity ${!isRoundOpen ? 'ring-2 ring-yellow-400' : ''}`}
        >
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Paraula</label>
            <input
              type="text"
              value={word}
              onChange={handleWordChange}
              className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-4xl font-mono font-bold tracking-widest uppercase text-center focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
              placeholder="LLIBRE"
              autoComplete="off"
            />
          </div>

          {tilesPreview.length > 0 && (
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div className="text-[10px] text-indigo-400 mb-2 text-center uppercase tracking-wider font-bold">Clica una fitxa per marcar Escarràs</div>
                <div className="flex flex-wrap gap-2 justify-center">
                    {tilesPreview.map((t, i) => (
                        <Tile key={i} tile={t} size="md" onClick={() => handleTileClick(i)} className="shadow-sm" />
                    ))}
                </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 text-center">Columna</label>
              <select value={col} onChange={(e) => setCol(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-md text-xl font-bold text-center shadow-sm">
                {COL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 text-center">Fila</label>
              <select value={row} onChange={(e) => setRow(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-md text-xl font-bold text-center shadow-sm">
                {ROW_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="flex rounded-lg bg-gray-100 p-1">
               <button type="button" onClick={() => setDirection('H')} className={`flex-1 py-3 rounded-md font-bold text-sm transition-all ${direction === 'H' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>HORITZONTAL →</button>
               <button type="button" onClick={() => setDirection('V')} className={`flex-1 py-3 rounded-md font-bold text-sm transition-all ${direction === 'V' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>VERTICAL ↓</button>
          </div>

          <button
            type="submit"
            disabled={submitted || !word}
            className={`w-full py-5 rounded-xl text-white font-black text-xl shadow-xl transition-all mt-4 transform active:scale-95
              ${submitted ? 'bg-green-500 scale-95' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'}
            `}
          >
            {submitted ? 'ENVIAT!' : 'ENVIAR JUGADA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlayerView;
