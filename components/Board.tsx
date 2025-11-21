
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
  
  // Modern Color Palette
  const getCellColor = (m: MultiplierType) => {
    switch (m) {
      case MultiplierType.TripleWord: return 'bg-rose-500';     // Soft Modern Red
      case MultiplierType.DoubleWord: return 'bg-pink-300';     // Soft Pink
      case MultiplierType.TripleLetter: return 'bg-blue-500';   // Strong Blue
      case MultiplierType.DoubleLetter: return 'bg-sky-200';    // Pale Blue
      case MultiplierType.Center: return 'bg-indigo-500';       // Deep Indigo
      default: return 'bg-white';                               // Clean White Canvas
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

  // Dynamic text color based on background brightness for contrast
  const getTextColor = (m: MultiplierType) => {
      switch (m) {
          case MultiplierType.DoubleWord:
          case MultiplierType.DoubleLetter:
              return 'text-slate-700'; // Dark text for light backgrounds
          case MultiplierType.Normal:
              return 'text-slate-200'; // Very subtle for empty cells
          default:
              return 'text-white';     // White text for dark backgrounds
      }
  };

  return (
    <div className={`inline-block w-full max-w-full p-1 md:p-2 bg-slate-300 rounded-lg shadow-xl ${className}`}>
      {/* Grid fluid: La primera columna és auto, la resta es reparteixen l'espai */}
      <div className="grid grid-cols-[auto_repeat(15,minmax(0,1fr))] gap-[1px]">
        
        {/* Header Row (1-15) */}
        <div className="bg-slate-300"></div> {/* Corner spacer */}
        {COL_LABELS.map((c) => (
          <div key={c} className="flex items-center justify-center text-slate-600 font-bold text-[0.5rem] md:text-xs aspect-square bg-slate-200 rounded-t-sm">
            {c}
          </div>
        ))}

        {board.map((row, rIndex) => (
          <React.Fragment key={`row-${rIndex}`}>
            {/* Row Label (A-O) */}
            <div className="flex items-center justify-center text-slate-600 font-bold text-[0.5rem] md:text-xs aspect-square bg-slate-200 rounded-l-sm px-1">
              {ROW_LABELS[rIndex]}
            </div>

            {/* Cells */}
            {row.map((cell) => {
                // Check for preview tile at this position
                const preview = previewTiles.find(p => p.row === rIndex && p.col === cell.col);
                const multiplierText = getCellText(cell.multiplier);
                const textColorClass = getTextColor(cell.multiplier);
                
                return (
                  <div
                    key={`cell-${cell.row}-${cell.col}`}
                    className={`
                      relative flex items-center justify-center aspect-square
                      ${getCellColor(cell.multiplier)}
                    `}
                  >
                    {!cell.tile && !preview && multiplierText && (
                      <span className={`text-[0.4rem] md:text-[0.65rem] font-bold select-none ${textColorClass}`}>
                        {multiplierText}
                      </span>
                    )}
                    
                    {/* Existing Board Tile - Override width/height to fit container */}
                    {cell.tile && (
                       <Tile tile={cell.tile} size="md" className="!w-full !h-full !text-[0.6rem] md:!text-base shadow-sm z-10" />
                    )}

                    {/* Preview Tile (Ghost) - Override width/height to fit container */}
                    {preview && !cell.tile && (
                        <div className="absolute inset-0 z-20 opacity-70">
                            <Tile tile={preview.tile} size="md" className="!w-full !h-full !text-[0.6rem] md:!text-base shadow-lg ring-1 ring-yellow-400 scale-95" />
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
