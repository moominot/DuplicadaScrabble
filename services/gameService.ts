
import { ref, set, get, update, push, remove } from 'firebase/database';
import { db } from '../firebaseConfig';
import { GameState, PlayerMove, RoundStatus, GameConfig, Participant } from '../types';
import { createInitialBoard, calculateRemainingBag, calculateMoveScore } from '../utils/scrabbleUtils';

// --- Helper Intern per llegir ---
const fetchGameState = async (gameId: string): Promise<GameState | null> => {
    try {
        const snapshot = await get(ref(db, `games/${gameId}`));
        if (!snapshot.exists()) return null;
        
        const data = snapshot.val();
        
        // Convertir el map de rounds/X/moves a un array pla 'moves' per a l'estat local si estem a la ronda actual
        const currentRoundMoves: PlayerMove[] = [];
        if (data.rounds && data.rounds[data.round] && data.rounds[data.round].moves) {
            Object.values(data.rounds[data.round].moves).forEach((m: any) => currentRoundMoves.push(m));
        }

        return {
            ...data,
            moves: currentRoundMoves,
            currentRack: data.currentRack || [],
            history: data.history || [],
            participants: data.participants || {}
        } as GameState;
    } catch (e) {
        console.error("Error fetching game state:", e);
        return null;
    }
};

// --- LOBBY & CREATION ---

export const createNewGame = async (hostName: string): Promise<string> => {
    const newGameRef = push(ref(db, 'games'));
    const gameId = newGameRef.key;
    
    if (!gameId) throw new Error("Error generant ID de partida");

    const initialState = {
        board: createInitialBoard(),
        currentRack: [],
        status: RoundStatus.IDLE,
        round: 1,
        lastPlayedMove: null,
        history: [],
        participants: {}, // Inicialitzat buit
        config: {
            timerDurationSeconds: 180,
            judgeName: hostName || 'MÀSTER'
        },
        roundStartTime: null,
        timerEndTime: null,
        timerPausedRemaining: null
    };

    await set(newGameRef, initialState);
    
    const metadata = {
        id: gameId,
        host: hostName,
        createdAt: Date.now(),
        round: 1
    };
    await set(ref(db, `publicGames/${gameId}`), metadata);

    return gameId;
};

export const getPublicGames = async () => {
    try {
        const snapshot = await get(ref(db, 'publicGames'));
        if (!snapshot.exists()) return [];
        const data = snapshot.val();
        return Object.values(data).sort((a: any, b: any) => b.createdAt - a.createdAt);
    } catch (e) {
        console.error("Error getting public games:", e);
        return [];
    }
};

// --- GAMEPLAY ACTIONS ---

export const updateConfig = async (gameId: string, config: Partial<GameConfig>) => {
    await update(ref(db, `games/${gameId}/config`), config);
};

export const updateRoundNumber = async (gameId: string, round: number) => {
    await update(ref(db, `games/${gameId}`), { round });
    await update(ref(db, `publicGames/${gameId}`), { round });
};

/**
 * El jugador envia la jugada "crua" (sense puntuació).
 * Es guarda a games/{id}/rounds/{round}/moves/{playerId}
 */
export const submitMove = async (gameId: string, move: PlayerMove) => {
  // Només comprovem el format bàsic, no la lògica de joc
  await set(ref(db, `games/${gameId}/rounds/${move.roundNumber}/moves/${move.playerId}`), move);
  
  // Actualitzem el nom del participant si ha canviat (o és nou)
  await update(ref(db, `games/${gameId}/participants/${move.playerId}`), {
      id: move.playerId,
      name: move.playerName,
      tableNumber: move.tableNumber
      // No toquem el score encara
  });
};

export const updateRack = async (gameId: string, newRack: string[]) => {
  await update(ref(db, `games/${gameId}`), { currentRack: newRack });
};

export const refillRack = async (gameId: string) => {
  const state = await fetchGameState(gameId);
  if (!state || state.status !== RoundStatus.IDLE) return;

  const currentCount = state.currentRack ? state.currentRack.length : 0;
  if (currentCount < 7) {
      const bag = calculateRemainingBag(state.board, state.currentRack || []);
      const needed = 7 - currentCount;
      
      if (bag.length > 0) {
          const tilesToAdd = bag.slice(0, needed);
          const newRack = [...(state.currentRack || []), ...tilesToAdd];
          await update(ref(db, `games/${gameId}`), { currentRack: newRack });
      }
  }
};

// --- TIMER LOGIC ---

export const openRound = async (gameId: string) => {
    const state = await fetchGameState(gameId);
    if (!state) return;

    const bag = calculateRemainingBag(state.board, state.currentRack || []);
    const rackCount = (state.currentRack || []).length;
    if (bag.length > 0 && rackCount < 7) {
        throw new Error(`Falten fitxes al faristol! (${rackCount}/7) i el sac no és buit.`);
    }

    const durationMs = state.config.timerDurationSeconds * 1000;
    const now = Date.now();

    await update(ref(db, `games/${gameId}`), {
        status: RoundStatus.PLAYING,
        roundStartTime: now,
        timerEndTime: now + durationMs,
        timerPausedRemaining: null,
    });
    // Netejar jugades anteriors si n'hi hauria (per seguretat, encara que es guarden per ID de ronda)
};

export const closeRound = async (gameId: string) => {
    await update(ref(db, `games/${gameId}`), { 
        status: RoundStatus.REVIEW,
        timerEndTime: null, 
        timerPausedRemaining: null
    });
};

export const toggleTimer = async (gameId: string) => {
    const state = await fetchGameState(gameId);
    if (!state || state.status !== RoundStatus.PLAYING) return;

    const now = Date.now();

    if (state.timerPausedRemaining) {
        const newEndTime = now + state.timerPausedRemaining;
        await update(ref(db, `games/${gameId}`), {
            timerEndTime: newEndTime,
            timerPausedRemaining: null
        });
    } else if (state.timerEndTime) {
        const remaining = state.timerEndTime - now;
        if (remaining > 0) {
            await update(ref(db, `games/${gameId}`), {
                timerEndTime: null,
                timerPausedRemaining: remaining
            });
        }
    }
};

export const resetTimer = async (gameId: string) => {
    const state = await fetchGameState(gameId);
    if (!state || state.status !== RoundStatus.PLAYING) return;

    const durationMs = state.config.timerDurationSeconds * 1000;
    const now = Date.now();

    await update(ref(db, `games/${gameId}`), {
        timerEndTime: now + durationMs,
        timerPausedRemaining: null
    });
};

/**
 * Funció principal que tanca la ronda i processa totes les dades.
 * 1. Llegeix totes les jugades crues.
 * 2. Calcula punts i validació (temps i normes).
 * 3. Actualitza classificació global.
 * 4. Aplica jugada mestra al tauler.
 */
export const finalizeRound = async (gameId: string, masterMove: PlayerMove) => {
  const state = await fetchGameState(gameId);
  if (!state) throw new Error("No s'ha pogut llegir l'estat de la partida");
  
  // 1. Processar Participants i Puntuacions
  const updates: any = {};
  const currentParticipants = { ...state.participants };
  const roundMoves = state.moves || [];
  
  // Temps límit (amb 5 segons de gràcia)
  const gracePeriod = 5000; 
  const roundEndTime = (state.roundStartTime || 0) + (state.config.timerDurationSeconds * 1000);

  // Iterem sobre totes les jugades enviades per calcular-ne la puntuació final real
  for (const move of roundMoves) {
      const pid = move.playerId;
      if (!currentParticipants[pid]) {
          currentParticipants[pid] = { 
              id: pid, 
              name: move.playerName, 
              tableNumber: move.tableNumber, 
              totalScore: 0, 
              roundScores: {} 
          };
      }

      // Validació de temps
      let isLate = false;
      if (state.roundStartTime && move.timestamp > (roundEndTime + gracePeriod)) {
          isLate = true;
      }

      // Càlcul de Punts: Validem la jugada del jugador contra el tauler ACTUAL (abans de posar la mestra)
      const result = calculateMoveScore(
          state.board,
          move.tiles,
          state.currentRack,
          move.row,
          move.col,
          move.direction
      );

      let finalScore = result.isValid ? result.score : 0;
      let error = result.error;

      if (isLate) {
          finalScore = 0;
          error = "Fora de temps";
      }

      // Actualitzem Participant
      currentParticipants[pid].roundScores = currentParticipants[pid].roundScores || {};
      currentParticipants[pid].roundScores[state.round] = finalScore;
      
      // Recalcular total score sumant tot l'històric
      let newTotal = 0;
      Object.values(currentParticipants[pid].roundScores).forEach(s => newTotal += s);
      currentParticipants[pid].totalScore = newTotal;

      // Guardar el resultat calculat a la ronda
      updates[`games/${gameId}/rounds/${state.round}/results/${pid}`] = {
          ...move,
          score: finalScore,
          valid: result.isValid && !isLate,
          error: error
      };
  }

  // 2. Aplicar Jugada Mestra al Tauler
  const { row, col, direction, tiles } = masterMove;
  const newBoard = state.board.map(r => r.map(c => ({ ...c })));
  const tilesUsedFromRack: string[] = [];

  tiles.forEach((tile, index) => {
      const r = direction === 'H' ? row : row + index;
      const c = direction === 'H' ? col + index : col;
      
      if (r >= 0 && r < 15 && c >= 0 && c < 15) {
          const existingCell = newBoard[r][c];
          if (!existingCell.tile) {
              newBoard[r][c] = { ...existingCell, tile: tile };
              if (tile.isBlank) tilesUsedFromRack.push('?');
              else tilesUsedFromRack.push(tile.char.toUpperCase());
          }
      }
  });
  
  const boardSnapshot = JSON.parse(JSON.stringify(newBoard));

  // 3. Netejar Faristol
  const newRack = [...(state.currentRack || [])];
  for (const charToRemove of tilesUsedFromRack) {
      const idx = newRack.indexOf(charToRemove);
      if (idx !== -1) newRack.splice(idx, 1);
      else {
          const wildcardIdx = newRack.indexOf('?');
          if (wildcardIdx !== -1) newRack.splice(wildcardIdx, 1);
      }
  }

  // 4. Arxivar Històric
  const newHistoryEntry = {
      roundNumber: state.round,
      masterMove: masterMove,
      rack: [...(state.currentRack || [])],
      boardSnapshot: boardSnapshot,
      startTime: state.roundStartTime || undefined,
      endTime: Date.now()
  };
  const newHistory = [...(state.history || []), newHistoryEntry];

  // Preparar Update Atòmic
  updates[`games/${gameId}/board`] = newBoard;
  updates[`games/${gameId}/participants`] = currentParticipants;
  updates[`games/${gameId}/history`] = newHistory;
  updates[`games/${gameId}/currentRack`] = newRack;
  updates[`games/${gameId}/lastPlayedMove`] = masterMove;
  updates[`games/${gameId}/round`] = state.round + 1;
  
  // Reset estat ronda
  updates[`games/${gameId}/roundStartTime`] = null;
  updates[`games/${gameId}/timerEndTime`] = null;
  updates[`games/${gameId}/timerPausedRemaining`] = null;
  updates[`games/${gameId}/status`] = RoundStatus.IDLE;
  
  updates[`publicGames/${gameId}/round`] = state.round + 1;

  await update(ref(db), updates);
};

export const resetGame = async (gameId: string) => {
    await remove(ref(db, `games/${gameId}`));
    await remove(ref(db, `publicGames/${gameId}`));
    window.location.href = '/';
};
