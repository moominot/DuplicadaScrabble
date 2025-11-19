
import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { GameState } from '../types';

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
        // Migracions i sanejament de dades (Firebase elimina arrays buits)
        if (!data.history) data.history = [];
        if (!data.moves) data.moves = [];
        if (!data.playerScores) data.playerScores = {};
        if (!data.currentRack) data.currentRack = []; // FIX CRÍTIC: Evita error .map undefined
        
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
