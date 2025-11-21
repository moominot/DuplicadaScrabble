
import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { GameState, PlayerMove } from '../types';

export const useGame = (gameId: string | null) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const gameRef = ref(db, `games/${gameId}`);

    const handleValue = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        // 1. Inicialització de dades bàsiques
        if (!data.history) data.history = [];
        if (!data.playerScores) data.playerScores = {};
        if (!data.currentRack) data.currentRack = [];
        
        // 2. LÒGICA CRÍTICA: Extreure les jugades de la ronda actual
        // Les dades estan a: rounds -> {numRonda} -> moves -> {playerId} -> {MoveData}
        const currentRound = data.round || 1;
        let currentRoundMoves: PlayerMove[] = [];

        if (data.rounds && data.rounds[currentRound] && data.rounds[currentRound].moves) {
            // Convertim l'objecte de Firebase (Map) a un Array per a la vista
            currentRoundMoves = Object.values(data.rounds[currentRound].moves);
        }

        // Assignem les jugades a la propietat 'moves' que esperen les vistes
        data.moves = currentRoundMoves;
        
        setGameState(data as GameState);
      } else {
        setError("Partida no trobada");
        setGameState(null);
      }
      setLoading(false);
    };

    // Subscriure's als canvis
    onValue(gameRef, handleValue, (err) => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });

    return () => {
      // Netejar subscripció
      off(gameRef, 'value', handleValue);
    };
  }, [gameId]);

  return { gameState, loading, error };
};
