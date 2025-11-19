
import { GameState, PlayerMove, RoundStatus, GameConfig } from '../types';
import { createInitialBoard, calculateRemainingBag } from '../utils/scrabbleUtils';

const STORAGE_KEY = 'scrabble_duplicat_state';

// Inicialització amb bossa dinàmica (no guardada) i faristol buit inicialment
const setupInitialState = (): GameState => {
    return {
        board: createInitialBoard(),
        currentRack: [],
        status: RoundStatus.IDLE,
        round: 1,
        moves: [],
        lastPlayedMove: null,
        history: [],
        playerScores: {},
        config: {
            timerDurationSeconds: 180, // 3 minutes default
            judgeName: 'MÀSTER'
        },
        roundStartTime: null
    };
};

export const getGameState = (): GameState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const newState = setupInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    return newState;
  }
  const parsed = JSON.parse(stored);
  // Migrations
  if (!parsed.status) parsed.status = RoundStatus.IDLE;
  // Remove old 'bag' property if exists to avoid confusion
  delete parsed.bag;
  
  if (!parsed.config) {
      parsed.config = { timerDurationSeconds: 180, judgeName: 'MÀSTER' };
  }
  return parsed;
};

export const saveGameState = (state: GameState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('storage'));
};

export const updateConfig = (config: Partial<GameConfig>) => {
    const state = getGameState();
    state.config = { ...state.config, ...config };
    saveGameState(state);
};

export const updateRoundNumber = (round: number) => {
    const state = getGameState();
    state.round = round;
    saveGameState(state);
};

export const submitMove = (move: PlayerMove) => {
  const state = getGameState();
  if (state.status !== RoundStatus.PLAYING) return; // Reject moves if not playing

  // Check if player already moved this round, replace if so
  const existingIdx = state.moves.findIndex(m => m.playerName === move.playerName);
  if (existingIdx >= 0) {
      state.moves[existingIdx] = move;
  } else {
      state.moves.push(move);
  }
  saveGameState(state);
};

export const updateRack = (newRack: string[]) => {
  const state = getGameState();
  if (state.status !== RoundStatus.IDLE) return; // Only allow editing in IDLE
  state.currentRack = newRack;
  saveGameState(state);
};

export const refillRack = () => {
  const state = getGameState();
  if (state.status !== RoundStatus.IDLE) return;

  const currentCount = state.currentRack.length;
  if (currentCount < 7) {
      const bag = calculateRemainingBag(state.board, state.currentRack);
      const needed = 7 - currentCount;
      
      if (bag.length > 0) {
          const tilesToAdd = bag.slice(0, needed); // bag is already shuffled
          state.currentRack = [...state.currentRack, ...tilesToAdd];
          saveGameState(state);
      }
  }
};

export const openRound = () => {
    const state = getGameState();
    state.status = RoundStatus.PLAYING;
    state.roundStartTime = Date.now();
    state.moves = []; // Reset moves for the new attempt
    saveGameState(state);
};

export const closeRound = () => {
    const state = getGameState();
    state.status = RoundStatus.REVIEW;
    saveGameState(state);
};

/**
 * UNIFIED FUNCTION: 
 * 1. Applies the Master Move to the board.
 * 2. Updates scores.
 * 3. Archives history.
 * 4. Cleans up the rack (removes used tiles).
 * 5. Advances to next round IDLE state.
 */
export const finalizeRound = (masterMove: PlayerMove, roundMovesWithScores: PlayerMove[]) => {
  const state = getGameState();
  
  const { row, col, direction, tiles } = masterMove;
  const tilesToRemoveFromRack: string[] = [];

  // 1. Identify which tiles are NEW (from rack) vs existing (on board)
  // We do this BEFORE modifying the board
  tiles.forEach((tile, index) => {
      const r = direction === 'H' ? row : row + index;
      const c = direction === 'H' ? col + index : col;
      
      if (r >= 0 && r < 15 && c >= 0 && c < 15) {
          const existingCell = state.board[r][c];
          // If cell is empty, we are placing a new tile from the rack
          if (!existingCell.tile) {
              tilesToRemoveFromRack.push(tile.char.toUpperCase());
              // Update board now
              state.board[r][c].tile = tile; 
          }
      }
  });
  
  const boardSnapshot = JSON.parse(JSON.stringify(state.board));

  // 2. Update Scores
  roundMovesWithScores.forEach(m => {
      const current = state.playerScores[m.playerName] || 0;
      state.playerScores[m.playerName] = current + (m.score || 0);
  });

  // Ensure Master gets points if tracked (though usually Master is virtual)
  if (!state.playerScores[masterMove.playerName] && masterMove.playerName !== 'MÀSTER') {
       state.playerScores[masterMove.playerName] = masterMove.score;
  }

  // 3. Archive History
  state.history.push({
      roundNumber: state.round,
      masterMove: masterMove,
      rack: [...state.currentRack],
      boardSnapshot: boardSnapshot,
      startTime: state.roundStartTime || undefined,
      endTime: Date.now()
  });

  state.lastPlayedMove = masterMove;

  // 4. Clean Rack (Remove ONLY the tiles that were actually placed)
  const newRack = [...state.currentRack];
  
  for (const char of tilesToRemoveFromRack) {
      const exactIdx = newRack.indexOf(char);
      if (exactIdx !== -1) {
          newRack.splice(exactIdx, 1);
      } else {
          // Check for Wildcard (?)
          const wildcardIdx = newRack.indexOf('?');
           if (wildcardIdx !== -1) {
               newRack.splice(wildcardIdx, 1);
           }
      }
  }
  state.currentRack = newRack;

  // 5. Advance Round
  state.round += 1;
  state.moves = [];
  state.roundStartTime = null;
  state.status = RoundStatus.IDLE;

  saveGameState(state);
};

export const resetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
}
