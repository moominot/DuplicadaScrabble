
import React, { useState, useEffect } from 'react';
import { ROW_LABELS, COL_LABELS } from '../constants';
import { parseInputWord, calculateMoveScore, getTileIndices } from '../utils/scrabbleUtils';
import { submitMove, getGameState } from '../services/gameService';
import { Tile as TileType } from '../types';
import Tile from '../components/Tile';

const PlayerView: React.FC = () => {
  // Login State
  const [storedName, setStoredName] = useState(localStorage.getItem('scrabble_player_name') || '');
  const [inputName, setInputName] = useState(storedName);
  const [isPlaying, setIsPlaying] = useState(!!storedName);

  // Game State
  const [word, setWord] = useState('');
  const [col, setCol] = useState('H');
  const [row, setRow] = useState('8');
  const [direction, setDirection] = useState<'H' | 'V'>('H');
  const [submitted, setSubmitted] = useState(false);
  const [tilesPreview, setTilesPreview] = useState<TileType[]>([]);
  
  // Round Logic
  const [currentRound, setCurrentRound] = useState(1);
  
  // Auto-sync round with global state
  useEffect(() => {
      const interval = setInterval(() => {
          const state = getGameState();
          // Only update if we haven't locally overridden it drastically? 
          // For now, simple sync is safest.
          setCurrentRound(state.round);
      }, 2000);
      return () => clearInterval(interval);
  }, []);

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
      if (inputName.trim()) {
          localStorage.setItem('scrabble_player_name', inputName.trim());
          setStoredName(inputName.trim());
          setIsPlaying(true);
      }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !storedName) return;

    const rIndex = ROW_LABELS.indexOf(row);
    const cIndex = COL_LABELS.indexOf(col);
    
    // Basic validation check locally
    const state = getGameState();
    const result = calculateMoveScore(state.board, tilesPreview, state.currentRack, rIndex, cIndex, direction);

    if (!result.isValid) {
        alert(result.error);
        return;
    }

    submitMove({
      id: Date.now().toString(),
      playerName: storedName,
      word: word,
      tiles: tilesPreview,
      row: rIndex,
      col: cIndex,
      direction,
      score: 0, 
      timestamp: Date.now(),
      roundNumber: currentRound
    });

    setSubmitted(true);
    setTimeout(() => {
        setSubmitted(false);
        setWord('');
    }, 2000);
  };

  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6">
          <div className="text-center">
              <h2 className="text-3xl font-black text-slate-800 mb-2">BENVINGUT/DA</h2>
              <p className="text-slate-500">Introdueix el teu nom i número de taula.</p>
          </div>
          
          <div>
              <label className="block text-sm font-bold text-slate-600 uppercase mb-2">Identificació</label>
              <input
                type="text"
                placeholder="NOM #12"
                className="w-full p-4 border-2 border-slate-200 rounded-xl text-xl font-bold uppercase focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
                value={inputName}
                onChange={(e) => setInputName(e.target.value.toUpperCase())}
                autoFocus
              />
          </div>
          
          <button 
            type="submit"
            disabled={!inputName.trim()}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:bg-indigo-700 shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ENTRAR A LA PARTIDA
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                  <span className="text-2xl">👤</span>
              </div>
              <div>
                  <div className="text-xs text-gray-500 font-bold uppercase">Jugador</div>
                  <div className="text-lg font-black text-slate-800 leading-none">{storedName}</div>
              </div>
          </div>
          <button 
            onClick={() => { setIsPlaying(false); localStorage.removeItem('scrabble_player_name'); }} 
            className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100"
          >
            SORTIR
          </button>
        </header>

        {/* Round Indicator */}
        <div className="flex justify-between items-center bg-slate-800 text-white p-3 rounded-xl shadow-md">
             <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Enviant per a:</span>
             <div className="flex items-center gap-2">
                 <span className="font-bold">RONDA</span>
                 <input 
                    type="number" 
                    value={currentRound}
                    onChange={(e) => setCurrentRound(parseInt(e.target.value) || 1)}
                    className="w-12 bg-slate-700 text-center font-mono text-xl font-bold rounded border border-slate-600 focus:border-blue-400 outline-none"
                 />
             </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 space-y-5">
          
          {/* Word Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Paraula</label>
            <input
              type="text"
              value={word}
              onChange={handleWordChange}
              className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-4xl font-mono font-bold tracking-widest uppercase text-center focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-gray-300"
              placeholder="LLIBRE"
              autoComplete="off"
            />
          </div>

          {/* Preview & Blanks */}
          {tilesPreview.length > 0 && (
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div className="text-[10px] text-indigo-400 mb-2 text-center uppercase tracking-wider font-bold">Clica una fitxa per marcar Escarràs</div>
                <div className="flex flex-wrap gap-2 justify-center">
                    {tilesPreview.map((t, i) => (
                        <Tile 
                            key={i} 
                            tile={t} 
                            size="md" 
                            onClick={() => handleTileClick(i)}
                            className="shadow-sm"
                        />
                    ))}
                </div>
            </div>
          )}

          {/* Coordinates Grid */}
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

          {/* Direction Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1">
               <button
                 type="button"
                 onClick={() => setDirection('H')}
                 className={`flex-1 py-3 rounded-md font-bold text-sm transition-all ${direction === 'H' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
               >
                 HORITZONTAL →
               </button>
               <button
                 type="button"
                 onClick={() => setDirection('V')}
                 className={`flex-1 py-3 rounded-md font-bold text-sm transition-all ${direction === 'V' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
               >
                 VERTICAL ↓
               </button>
          </div>

          <button
            type="submit"
            disabled={submitted || !word}
            className={`w-full py-5 rounded-xl text-white font-black text-xl shadow-xl transition-all mt-4 transform active:scale-95
              ${submitted ? 'bg-green-500 scale-95' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'}
            `}
          >
            {submitted ? 'ENVIAT CORRECTAMENT!' : 'ENVIAR JUGADA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlayerView;
