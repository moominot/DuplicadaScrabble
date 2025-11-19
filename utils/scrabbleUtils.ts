
import { 
  BOARD_SIZE, 
  TRIPLE_WORD_COORDS, 
  DOUBLE_WORD_COORDS, 
  TRIPLE_LETTER_COORDS, 
  DOUBLE_LETTER_COORDS,
  TILE_COUNTS
} from '../constants';
import { 
  BoardCell, 
  MultiplierType, 
  Tile, 
  DIGRAPH_MAP, 
  REVERSE_DIGRAPH_MAP, 
  LETTER_VALUES 
} from '../types';

export const createInitialBoard = (): BoardCell[][] => {
  const board: BoardCell[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = `${r},${c}`;
      let multiplier = MultiplierType.Normal;
      
      if (r === 7 && c === 7) multiplier = MultiplierType.Center;
      else if (TRIPLE_WORD_COORDS.includes(key)) multiplier = MultiplierType.TripleWord;
      else if (DOUBLE_WORD_COORDS.includes(key)) multiplier = MultiplierType.DoubleWord;
      else if (TRIPLE_LETTER_COORDS.includes(key)) multiplier = MultiplierType.TripleLetter;
      else if (DOUBLE_LETTER_COORDS.includes(key)) multiplier = MultiplierType.DoubleLetter;

      row.push({
        row: r,
        col: c,
        multiplier,
        tile: null
      });
    }
    board.push(row);
  }
  return board;
};

/**
 * Creates a Tile object from an internal char string.
 * Exported so MasterView can generate Tiles with correct values for the rack.
 */
export const createTile = (char: string): Tile => {
  const isBlank = char === char.toLowerCase() && char.toUpperCase() !== char.toLowerCase();
  const upperChar = char.toUpperCase();
  
  // Calculate display char
  let displayChar = REVERSE_DIGRAPH_MAP[upperChar] || upperChar;
  // If it's a wildcard from the rack (represented as '?'), display as is
  if (char === '?') {
      displayChar = '?';
      return { char: '?', value: 0, isBlank: true, displayChar: '?' };
  }
  
  // Calculate value
  let value = isBlank ? 0 : (LETTER_VALUES[upperChar] || 0);

  return {
    char,
    value,
    isBlank,
    displayChar
  };
};

/**
 * Parses a raw input string into Scrabble Tiles.
 */
export const parseInputWord = (input: string): Tile[] => {
  const tiles: Tile[] = [];
  let i = 0;
  
  while (i < input.length) {
    let char = input[i];
    let nextChar = input[i + 1] || '';
    
    const threeChars = char + nextChar + (input[i + 2] || '');
    const twoChars = char + nextChar;

    // Handle L·L (could be 3 chars)
    if (['L·L', 'L.L', 'L-L'].includes(threeChars.toUpperCase())) {
      const isBlank = threeChars[0] === threeChars[0].toLowerCase();
      const internal = isBlank ? 'ł' : 'Ł';
      tiles.push(createTile(internal));
      i += 3;
      continue;
    }

    // Handle QU, NY
    if (['QU', 'NY'].includes(twoChars.toUpperCase())) {
       const upperDigraph = twoChars.toUpperCase();
       const mapped = DIGRAPH_MAP[upperDigraph];
       if (mapped) {
         const isBlank = twoChars[0] === twoChars[0].toLowerCase();
         const internal = isBlank ? mapped.toLowerCase() : mapped;
         tiles.push(createTile(internal));
         i += 2;
         continue;
       }
    }

    tiles.push(createTile(char));
    i++;
  }
  return tiles;
};

/**
 * Returns the start and end indices in the original string for each tile.
 * Used to handle click-to-toggle-blank logic.
 */
export const getTileIndices = (input: string) => {
    const indices: {start: number, end: number}[] = [];
    let i = 0;
    while (i < input.length) {
        let start = i;
        let char = input[i];
        let nextChar = input[i + 1] || '';
        const threeChars = char + nextChar + (input[i + 2] || '');
        const twoChars = char + nextChar;

        if (['L·L', 'L.L', 'L-L'].includes(threeChars.toUpperCase())) {
            indices.push({start, end: i + 3});
            i += 3;
        } else if (['QU', 'NY'].includes(twoChars.toUpperCase()) && DIGRAPH_MAP[twoChars.toUpperCase()]) {
            indices.push({start, end: i + 2});
            i += 2;
        } else {
            indices.push({start, end: i + 1});
            i += 1;
        }
    }
    return indices;
};

export interface ScoreResult {
  score: number;
  isValid: boolean;
  error?: string;
}

export const calculateMoveScore = (
  board: BoardCell[][], 
  tiles: Tile[], 
  currentRack: string[],
  startRow: number, 
  startCol: number, 
  direction: 'H' | 'V'
): ScoreResult => {
  let wordScore = 0;
  let wordMultiplier = 1;
  let tilesUsedFromRack = 0;
  
  const rackAvailable = [...currentRack]; 

  for (let i = 0; i < tiles.length; i++) {
    const r = direction === 'H' ? startRow : startRow + i;
    const c = direction === 'H' ? startCol + i : startCol;

    // Boundary Check
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) {
        return { score: 0, isValid: false, error: "Fora del tauler" };
    }

    const cell = board[r][c];
    const tile = tiles[i];
    const tileInternalChar = tile.char.toUpperCase(); 

    let tilePoints = tile.value;

    if (cell.tile) {
      // Existing Tile Validation
      if (cell.tile.char.toUpperCase() !== tileInternalChar) {
        return { 
            score: 0, 
            isValid: false, 
            error: `Conflicte a ${String.fromCharCode(65+c)}${r+1}: El tauler té '${cell.tile.displayChar}' però has posat '${tile.displayChar}'.`
        };
      }
      tilePoints = cell.tile.value;
    } else {
      // New Tile Validation against Rack
      const rackIndex = rackAvailable.indexOf(tileInternalChar);
      
      if (rackIndex !== -1) {
        rackAvailable.splice(rackIndex, 1);
      } else {
          const jokerIndex = rackAvailable.indexOf('?'); 
          if (jokerIndex !== -1) {
              rackAvailable.splice(jokerIndex, 1);
          } else {
             if (tile.isBlank) {
                 return { score: 0, isValid: false, error: `No tens cap Escarràs (?) per '${tile.displayChar}'.` };
             } else {
                 return { score: 0, isValid: false, error: `Et falta la lletra '${tile.displayChar}'.` };
             }
          }
      }

      tilesUsedFromRack++;

      // Apply Multipliers
      if (cell.multiplier === MultiplierType.DoubleLetter) tilePoints *= 2;
      else if (cell.multiplier === MultiplierType.TripleLetter) tilePoints *= 3;
      
      if (cell.multiplier === MultiplierType.DoubleWord || cell.multiplier === MultiplierType.Center) wordMultiplier *= 2;
      else if (cell.multiplier === MultiplierType.TripleWord) wordMultiplier *= 3;
    }
    
    wordScore += tilePoints;
  }

  wordScore *= wordMultiplier;

  // Bingo Bonus
  if (tilesUsedFromRack === 7) {
    wordScore += 50;
  }

  return {
      score: wordScore,
      isValid: true
  };
};

/**
 * Calculates the remaining tiles in the bag by subtracting used tiles (board + rack) from the total definition.
 */
export const calculateRemainingBag = (board: BoardCell[][], currentRack: string[]): string[] => {
    // 1. Count all tiles currently on board
    const usedCounts: Record<string, number> = {};
    
    // Initialize with board usage
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const tile = board[r][c].tile;
            if (tile) {
                const key = tile.isBlank ? '?' : tile.char.toUpperCase();
                usedCounts[key] = (usedCounts[key] || 0) + 1;
            }
        }
    }

    // 2. Add current rack usage
    for (const char of currentRack) {
        const key = char === '?' ? '?' : char.toUpperCase();
        usedCounts[key] = (usedCounts[key] || 0) + 1;
    }

    // 3. Reconstruct bag from Total - Used
    const bag: string[] = [];
    Object.entries(TILE_COUNTS).forEach(([char, total]) => {
        const used = usedCounts[char] || 0;
        const remaining = Math.max(0, total - used);
        for(let i=0; i<remaining; i++) {
            bag.push(char);
        }
    });

    // 4. Shuffle
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }

    return bag;
};
