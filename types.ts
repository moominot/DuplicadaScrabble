
export enum MultiplierType {
  Normal = 0,
  DoubleLetter = 1,
  TripleLetter = 2,
  DoubleWord = 3,
  TripleWord = 4,
  Center = 5
}

export enum RoundStatus {
  IDLE = 'IDLE',       // Preparant faristol
  PLAYING = 'PLAYING', // Ronda oberta, jugadors envien
  REVIEW = 'REVIEW'    // Ronda tancada, master tria jugada
}

export interface BoardCell {
  row: number;
  col: number;
  multiplier: MultiplierType;
  tile: Tile | null;
}

export interface Tile {
  char: string; // Internal representation (e.g., 'Û', 'A', 'a')
  value: number;
  isBlank: boolean;
  displayChar: string; // What is shown on screen (e.g., 'QU', 'A')
}

export interface PlayerMove {
  id: string;
  playerId: string; // Identificador únic (ex: "table_1")
  playerName: string; // Nom visible del jugador
  tableNumber: string; // Número de taula
  word: string; // Raw input string
  tiles: Tile[]; // Parsed tiles
  row: number; // 0-14
  col: number; // 0-14
  direction: 'H' | 'V';
  score?: number; // Opcional: El jugador no l'envia, el calcula el Màster
  timestamp: number; // Hora exacta de l'enviament
  roundNumber: number; // Ronda a la qual pertany la jugada
  isMasterMove?: boolean; 
  isValid?: boolean; // Calculat pel màster
  error?: string;    // Calculat pel màster
  penalty?: boolean; // Si s'ha enviat fora de temps
}

export interface Participant {
    id: string; // table_X
    name: string;
    tableNumber: string;
    totalScore: number;
    roundScores: Record<number, number>; // { 1: 20, 2: 35 ... }
}

export interface ArchivedRound {
  roundNumber: number;
  masterMove: PlayerMove;
  rack: string[];
  boardSnapshot: BoardCell[][];
  startTime?: number;
  endTime?: number;
}

export interface GameConfig {
  timerDurationSeconds: number;
  judgeName: string;
}

export interface GameState {
  board: BoardCell[][];
  currentRack: string[];
  status: RoundStatus;
  round: number;
  
  // Nova estructura: Participants persistents
  participants: Record<string, Participant>;
  
  // Les jugades es guarden per ronda, però el client les rep aquí per facilitat
  // (El servei s'encarrega de mapar-ho correctament)
  moves: PlayerMove[]; 
  
  lastPlayedMove: PlayerMove | null;
  history: ArchivedRound[]; 
  config: GameConfig;
  
  // Timer Synchronization Logic
  roundStartTime: number | null;
  timerEndTime: number | null;
  timerPausedRemaining: number | null;
}

export const DIGRAPH_MAP: Record<string, string> = {
  'QU': 'Û',
  'L·L': 'Ł', 'L.L': 'Ł', 'L-L': 'Ł', 'ĿL': 'Ł',
  'NY': 'Ý'
};

export const REVERSE_DIGRAPH_MAP: Record<string, string> = {
  'Û': 'QU',
  'Ł': 'L·L',
  'Ý': 'NY'
};

export const LETTER_VALUES: Record<string, number> = {
  'A': 1, 'E': 1, 'I': 1, 'R': 1, 'S': 1, 'N': 1, 'O': 1, 'T': 1, 'L': 1, 'U': 1,
  'C': 2, 'D': 2, 'M': 2,
  'B': 3, 'G': 3, 'P': 3,
  'F': 4, 'V': 4,
  'H': 8, 'J': 8, 'Q': 8, 'Z': 8,
  'Ç': 10, 'X': 10,
  'Ł': 10, // L·L
  'Ý': 10, // NY
  'Û': 8,  // QU
};
