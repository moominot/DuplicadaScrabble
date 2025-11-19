import React from 'react';
import { Tile as TileType } from '../types';

interface TileProps {
  tile: TileType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const Tile: React.FC<TileProps> = ({ tile, size = 'md', className = '', onClick }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm', // Slightly bigger for touch targets
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-2xl font-bold',
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center justify-center 
        bg-[#fdf5e6] text-black rounded-sm shadow-[1px_2px_2px_rgba(0,0,0,0.3)] border border-[#e8d5b5]
        select-none transition-transform
        ${onClick ? 'cursor-pointer active:scale-95 hover:brightness-95' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className="z-10 font-bold">{tile.displayChar}</span>
      <span className="absolute bottom-[1px] right-[2px] text-[0.6em] font-bold text-gray-800 leading-none">
        {tile.value}
      </span>
      {/* Visual indicator for blank tile */}
      {tile.isBlank && (
        <div className="absolute inset-0 border-2 border-green-400/70 rounded-sm pointer-events-none"></div>
      )}
    </div>
  );
};

export default Tile;