export interface BookCover {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  imageUrl: string;
  active: boolean;
  createdAt: number;
}

export interface GameSettings {
  gameTitle: string;
  instructions: string;
  duration: number; // seconds
  mismatchDuration: number; // ms
  successScreenDuration: number; // seconds
  successMessage: string;
  timeoutMessage: string;
  autoNewGame: boolean;
  celebrationAnimation: boolean;
  soundEffects: boolean;
  showAds: boolean;
  logoUrl: string | null;
}

export interface Advertisement {
  id: string;
  title: string;
  type: 'image' | 'video' | 'text';
  imageUrl?: string;
  videoUrl?: string;
  text?: string;
  buttonText?: string;
  destinationUrl?: string;
  position: 'above' | 'below' | 'between' | 'success' | 'timeout';
  startDate: string;
  endDate: string;
  displayDuration: number; // seconds
  priority: number;
  active: boolean;
  createdAt: number;
}

export interface GameStats {
  totalPlayed: number;
  totalCompleted: number;
  totalFailed: number;
}

export interface CardState {
  id: number;
  bookCoverId: string;
  isFlipped: boolean;
  isMatched: boolean;
}
