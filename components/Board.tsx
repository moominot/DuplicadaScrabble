
import React from 'react';
import { BoardCell, MultiplierType, Tile as TileType } from '../types';
import { ROW_LABELS, COL_LABELS } from '../constants';
import Tile from './Tile';

interface BoardProps {
  board: BoardCell[][];
  className?: string;
  previewTiles?: { tile: TileType, row: number, col: number }[];
}

const Board: React.FC<BoardProps> = ({ board, className = '', previewTiles = [] }) => {
  
  const getCellColor = (m: MultiplierType) => {
    switch (m) {
      case MultiplierType.TripleWord: return 'bg-red-500';
      case MultiplierType.DoubleWord: return 'bg-pink-400';
      case MultiplierType.TripleLetter: return 'bg-blue-500';
      case MultiplierType.DoubleLetter: return 'bg-sky-300';
      case MultiplierType.Center: return 'bg-pink-500';
      default: return 'bg-[#156446]'; // Classic Green
    }
  };

  const getCellText = (m: MultiplierType) => {
    switch (m) {
      case MultiplierType.TripleWord: return 'TP';
      case MultiplierType.DoubleWord: return 'DP';
      case MultiplierType.TripleLetter: return 'TL';
      case MultiplierType.DoubleLetter: return 'DL';
      case MultiplierType.Center: return '★';
      default: return '';
    }
  };

  return (
    <div className={`inline-block p-2 bg-wood-pattern bg-[#3d2b1f] rounded-lg shadow-2xl ${className}`}>
      <div className="grid grid-cols-[auto_repeat(15,minmax(0,1fr))] gap-0.5">
        
        {/* Header Row (A-O) */}
        <div className="w-6 h-6"></div> {/* Corner spacer */}
        {COL_LABELS.map((c) => (
          <div key={c} className="flex items-center justify-center text-white text-xs font-mono w-6 md:w-9">
            {c}
          </div>
        ))}

        {board.map((row, rIndex) => (
          <React.Fragment key={`row-${rIndex}`}>
            {/* Row Label (1-15) */}
            <div className="flex items-center justify-center text-white text-xs font-mono h-6 md:h-9 w-6">
              {ROW_LABELS[rIndex]}
            </div>

            {/* Cells */}
            {row.map((cell) => {
                // Check for preview tile at this position
                const preview = previewTiles.find(p => p.row === rIndex && p.col === cell.col);
                
                return (
                  <div
                    key={`cell-${cell.row}-${cell.col}`}
                    className={`
                      relative w-6 h-6 md:w-9 md:h-9 flex items-center justify-center border border-white/10
                      ${getCellColor(cell.multiplier)}
                    `}
                  >
                    {!cell.tile && !preview && (
                      <span className="text-[0.5rem] md:text-[0.6rem] font-bold text-white/80 opacity-80">
                        {getCellText(cell.multiplier)}
                      </span>
                    )}
                    
                    {/* Existing Board Tile */}
                    {cell.tile && (
                       <Tile tile={cell.tile} size="md" className="w-full h-full shadow-md z-10" />
                    )}

                    {/* Preview Tile (Ghost) */}
                    {preview && !cell.tile && (
                        <div className="absolute inset-0 z-20 opacity-80 scale-95">
                            <Tile tile={preview.tile} size="md" className="w-full h-full shadow-xl ring-2 ring-yellow-400" />
                        </div>
                    )}
                  </div>
                );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Board;
