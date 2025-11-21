
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

// Helper to get multiplier value
const getMultiplierVal = (type: MultiplierType, isWord: boolean): number => {
    if (isWord) {
        if (type === MultiplierType.DoubleWord || type === MultiplierType.Center) return 2;
        if (type === MultiplierType.TripleWord) return 3;
    } else {
        if (type === MultiplierType.DoubleLetter) return 2;
        if (type === MultiplierType.TripleLetter) return 3;
    }
    return 1;
};

export const calculateMoveScore = (
  board: BoardCell[][], 
  tiles: Tile[], 
  currentRack: string[],
  startRow: number, 
  startCol: number, 
  direction: 'H' | 'V'
): ScoreResult => {
  let totalScore = 0;
  
  let mainWordScore = 0;
  let mainWordMultiplier = 1;
  let tilesUsedFromRack = 0;
  
  const rackAvailable = [...(currentRack || [])]; 
  const dr = direction === 'H' ? 0 : 1;
  const dc = direction === 'H' ? 1 : 0;

  // 1. Calculate Main Word Score
  for (let i = 0; i < tiles.length; i++) {
    const r = startRow + (i * dr);
    const c = startCol + (i * dc);

    // Boundary Check
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) {
        return { score: 0, isValid: false, error: "Fora del tauler" };
    }

    const cell = board[r][c];
    const tile = tiles[i];
    const tileInternalChar = tile.char.toUpperCase(); 
    
    // Validate and Calculate Points for this cell
    if (cell.tile) {
      // --- EXISTING TILE ---
      if (cell.tile.char.toUpperCase() !== tileInternalChar) {
        return { 
            score: 0, 
            isValid: false, 
            error: `Conflicte a ${String.fromCharCode(65+r)}${c+1}: El tauler té '${cell.tile.displayChar}' però has posat '${tile.displayChar}'.`
        };
      }
      // Existing tiles retain their face value, but NO multipliers apply
      mainWordScore += cell.tile.value;
    } else {
      // --- NEW TILE ---
      // Check Rack
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

      // Apply Letter Multipliers to the Tile Value
      let letterVal = tile.value;
      const letterMult = getMultiplierVal(cell.multiplier, false);
      letterVal *= letterMult;
      
      mainWordScore += letterVal;

      // Accumulate Word Multiplier
      const wordMult = getMultiplierVal(cell.multiplier, true);
      mainWordMultiplier *= wordMult;

      // --- CROSS WORD CALCULATION (Perpendicular) ---
      // If we placed a NEW tile, check if it forms a word in the other direction
      const crossDr = direction === 'H' ? 1 : 0;
      const crossDc = direction === 'H' ? 0 : 1;
      
      // Check immediate neighbors
      const prevR = r - crossDr; 
      const prevC = c - crossDc;
      const nextR = r + crossDr; 
      const nextC = c + crossDc;

      const hasPrev = (prevR >= 0 && prevC >= 0 && prevR < BOARD_SIZE && prevC < BOARD_SIZE && board[prevR][prevC].tile);
      const hasNext = (nextR >= 0 && nextC >= 0 && nextR < BOARD_SIZE && nextC < BOARD_SIZE && board[nextR][nextC].tile);

      if (hasPrev || hasNext) {
          let crossWordScore = 0;
          let crossWordMultiplier = wordMult; // The multiplier of the CURRENT cell applies to the cross word too
          
          // 1. Add current tile value (with its letter multiplier)
          crossWordScore += letterVal; 

          // 2. Scan Backwards
          let currR = prevR;
          let currC = prevC;
          while (currR >= 0 && currC >= 0 && currR < BOARD_SIZE && currC < BOARD_SIZE && board[currR][currC].tile) {
              crossWordScore += board[currR][currC].tile!.value;
              currR -= crossDr;
              currC -= crossDc;
          }

          // 3. Scan Forwards
          currR = nextR;
          currC = nextC;
          while (currR >= 0 && currC >= 0 && currR < BOARD_SIZE && currC < BOARD_SIZE && board[currR][currC].tile) {
              crossWordScore += board[currR][currC].tile!.value;
              currR += crossDr;
              currC += crossDc;
          }

          // 4. Apply Word Multiplier to the whole cross word
          totalScore += (crossWordScore * crossWordMultiplier);
      }
    }
  }

  // Apply Main Word Multiplier
  totalScore += (mainWordScore * mainWordMultiplier);

  // Bingo Bonus (+50 points for using 7 tiles)
  if (tilesUsedFromRack === 7) {
    totalScore += 50;
  }

  return {
      score: totalScore,
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
    for (const char of (currentRack || [])) {
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
