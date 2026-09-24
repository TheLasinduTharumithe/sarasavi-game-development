import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore/lite';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import type { Advertisement, BookCover, GameSettings, GameStats } from './types';
import { firebaseAuth, requireFirebaseAuth, requireFirestore } from './firebase';

export const SAMPLE_BOOKS: BookCover[] = [
  { id: 'b1', title: 'The Alchemist', author: 'Paulo Coelho', isbn: '978-0062315007', imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
  { id: 'b2', title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0061743528', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
  { id: 'b3', title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '978-0141439518', imageUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
  { id: 'b4', title: '1984', author: 'George Orwell', isbn: '978-0451524935', imageUrl: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
  { id: 'b5', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '978-0743273565', imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
  { id: 'b6', title: 'Brave New World', author: 'Aldous Huxley', isbn: '978-0060850524', imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
  { id: 'b7', title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '978-0316769174', imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
  { id: 'b8', title: 'Don Quixote', author: 'Miguel de Cervantes', isbn: '978-0060934347', imageUrl: 'https://images.unsplash.com/photo-1491841651911-c44f000e4f6a?w=300&h=400&fit=crop&auto=format', active: true, createdAt: Date.now() },
];

export const DEFAULT_SETTINGS: GameSettings = {
  gameTitle: 'Book Cover Memory Match',
  instructions: 'Flip cards to find matching book cover pairs. Match all 8 pairs before time runs out!',
  duration: 30,
  mismatchDuration: 1000,
  successScreenDuration: 10,
  successMessage: 'Congratulations!\nYou successfully matched all the book covers!',
  timeoutMessage: "Time's Up!\nYou could not complete the game within the available time. Please try again.",
  autoNewGame: true,
  celebrationAnimation: true,
  soundEffects: true,
  showAds: true,
  logoUrl: null,
};

export const DEFAULT_STATS: GameStats = { totalPlayed: 0, totalCompleted: 0, totalFailed: 0 };

const BOOKS_COLLECTION = 'sarasavi_memory_books';
const ADS_COLLECTION = 'sarasavi_memory_ads';
const CONFIG_COLLECTION = 'sarasavi_memory_config';
const SETTINGS_DOCUMENT = 'game_settings';
const STATS_DOCUMENT = 'global_stats';
const MAX_DOCUMENT_BYTES = 850 * 1024;

export interface GameContent {
  books: BookCover[];
  settings: GameSettings;
  ads: Advertisement[];
}

function documentSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function assertDocumentSize(value: unknown, label: string) {
  if (documentSize(value) > MAX_DOCUMENT_BYTES) {
    throw new Error(`${label} is too large for Firestore. Use a smaller image and try again.`);
  }
}

function requireAdmin() {
  if (!firebaseAuth?.currentUser) {
    throw new Error('An authenticated Firebase administrator is required to save changes.');
  }
}

function toBook(id: string, data: DocumentData): BookCover | null {
  if (typeof data.title !== 'string' || typeof data.author !== 'string' || typeof data.imageUrl !== 'string') return null;
  return {
    id,
    title: data.title,
    author: data.author,
    isbn: typeof data.isbn === 'string' ? data.isbn : '',
    imageUrl: data.imageUrl,
    active: data.active !== false,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  };
}

function toAd(id: string, data: DocumentData): Advertisement | null {
  if (typeof data.title !== 'string' || !['image', 'video', 'text'].includes(data.type)) return null;
  if (!['above', 'below', 'between', 'success', 'timeout'].includes(data.position)) return null;
  return {
    id,
    title: data.title,
    type: data.type,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : undefined,
    text: typeof data.text === 'string' ? data.text : undefined,
    buttonText: typeof data.buttonText === 'string' ? data.buttonText : undefined,
    destinationUrl: typeof data.destinationUrl === 'string' ? data.destinationUrl : undefined,
    position: data.position,
    startDate: typeof data.startDate === 'string' ? data.startDate : new Date().toISOString(),
    endDate: typeof data.endDate === 'string' ? data.endDate : new Date().toISOString(),
    displayDuration: typeof data.displayDuration === 'number' ? data.displayDuration : 10,
    priority: typeof data.priority === 'number' ? data.priority : 1,
    active: data.active !== false,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  };
}

function cleanAd(ad: Advertisement): Record<string, string | number | boolean> {
  const value: Record<string, string | number | boolean> = {
    title: ad.title,
    type: ad.type,
    position: ad.position,
    startDate: ad.startDate,
    endDate: ad.endDate,
    displayDuration: ad.displayDuration,
    priority: ad.priority,
    active: ad.active,
    createdAt: ad.createdAt,
  };
  if (ad.imageUrl) value.imageUrl = ad.imageUrl;
  if (ad.videoUrl) value.videoUrl = ad.videoUrl;
  if (ad.text) value.text = ad.text;
  if (ad.buttonText) value.buttonText = ad.buttonText;
  if (ad.destinationUrl) value.destinationUrl = ad.destinationUrl;
  return value;
}

function toStats(data?: DocumentData): GameStats {
  return {
    totalPlayed: typeof data?.totalPlayed === 'number' ? data.totalPlayed : 0,
    totalCompleted: typeof data?.totalCompleted === 'number' ? data.totalCompleted : 0,
    totalFailed: typeof data?.totalFailed === 'number' ? data.totalFailed : 0,
  };
}

export const store = {
  async getBooks(): Promise<BookCover[]> {
    const snapshot = await getDocs(collection(requireFirestore(), BOOKS_COLLECTION));
    const books = snapshot.docs.map(item => toBook(item.id, item.data())).filter((book): book is BookCover => Boolean(book));
    return books.length ? books.sort((a, b) => a.createdAt - b.createdAt) : SAMPLE_BOOKS;
  },

  async saveBooks(books: BookCover[]): Promise<void> {
    requireAdmin();
    const database = requireFirestore();
    const existing = await getDocs(collection(database, BOOKS_COLLECTION));
    const nextIds = new Set(books.map(book => book.id));
    const batch = writeBatch(database);

    existing.docs.forEach(item => {
      if (!nextIds.has(item.id)) batch.delete(item.ref);
    });
    books.forEach(book => {
      const value = { ...book };
      assertDocumentSize(value, `Book '${book.title}'`);
      batch.set(doc(database, BOOKS_COLLECTION, book.id), value);
    });
    await batch.commit();
  },

  async getSettings(): Promise<GameSettings> {
    const snapshot = await getDoc(doc(requireFirestore(), CONFIG_COLLECTION, SETTINGS_DOCUMENT));
    return snapshot.exists() ? { ...DEFAULT_SETTINGS, ...snapshot.data() } as GameSettings : DEFAULT_SETTINGS;
  },

  async saveSettings(settings: GameSettings): Promise<void> {
    requireAdmin();
    assertDocumentSize(settings, 'Game settings');
    await setDoc(doc(requireFirestore(), CONFIG_COLLECTION, SETTINGS_DOCUMENT), settings);
  },

  async resetSettings(): Promise<GameSettings> {
    await store.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },

  async getAds(): Promise<Advertisement[]> {
    const snapshot = await getDocs(collection(requireFirestore(), ADS_COLLECTION));
    return snapshot.docs
      .map(item => toAd(item.id, item.data()))
      .filter((ad): ad is Advertisement => Boolean(ad))
      .sort((a, b) => a.priority - b.priority);
  },

  async saveAds(ads: Advertisement[]): Promise<void> {
    requireAdmin();
    const database = requireFirestore();
    const existing = await getDocs(collection(database, ADS_COLLECTION));
    const nextIds = new Set(ads.map(ad => ad.id));
    const batch = writeBatch(database);

    existing.docs.forEach(item => {
      if (!nextIds.has(item.id)) batch.delete(item.ref);
    });
    ads.forEach(ad => {
      const value = cleanAd(ad);
      assertDocumentSize(value, `Advertisement '${ad.title}'`);
      batch.set(doc(database, ADS_COLLECTION, ad.id), value);
    });
    await batch.commit();
  },

  async getStats(): Promise<GameStats> {
    const snapshot = await getDoc(doc(requireFirestore(), CONFIG_COLLECTION, STATS_DOCUMENT));
    return snapshot.exists() ? toStats(snapshot.data()) : DEFAULT_STATS;
  },

  async incrementStats(field: keyof GameStats): Promise<void> {
    const reference = doc(requireFirestore(), CONFIG_COLLECTION, STATS_DOCUMENT);
    await runTransaction(requireFirestore(), async transaction => {
      const snapshot = await transaction.get(reference);
      const stats = snapshot.exists() ? toStats(snapshot.data()) : { ...DEFAULT_STATS };
      stats[field] += 1;
      transaction.set(reference, stats);
    });
  },

  getActiveAdsForPosition(ads: Advertisement[], position: Advertisement['position']): Advertisement[] {
    const now = Date.now();
    return ads
      .filter(ad => ad.active && ad.position === position)
      .filter(ad => new Date(ad.startDate).getTime() <= now && new Date(ad.endDate).getTime() >= now)
      .sort((a, b) => a.priority - b.priority);
  },

  async loadGameContent(): Promise<GameContent> {
    const [books, settings, ads] = await Promise.all([store.getBooks(), store.getSettings(), store.getAds()]);
    return { books, settings, ads };
  },

  subscribeToAuth(callback: (user: User | null) => void): () => void {
    if (!firebaseAuth) {
      callback(null);
      return () => undefined;
    }
    return onAuthStateChanged(firebaseAuth, callback);
  },

  async adminLogin(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(requireFirebaseAuth(), email, password);
  },

  async adminLogout(): Promise<void> {
    await signOut(requireFirebaseAuth());
  },
};
