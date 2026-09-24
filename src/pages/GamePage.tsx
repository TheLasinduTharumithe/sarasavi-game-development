import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { DEFAULT_SETTINGS, store } from '../store';
import { imageSrc } from '../imageUtils';
import type { Advertisement, BookCover, CardState, GameSettings } from '../types';
import sarasaviLogo from '../imports/sarasavi_email_logo.jpg';
import cardBoxLogo from '../imports/sarsavi logo.jpg';

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

type GameSound = 'tap' | 'win' | 'fail';
let audioContext: AudioContext | null = null;

function getAudioContext() {
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  audioContext ??= new AudioCtor();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => undefined);
  return audioContext;
}

function playTone(context: AudioContext, frequency: number, start: number, duration: number, volume = 0.09, type: OscillatorType = 'sine') {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playGameSound(sound: GameSound, enabled: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;

  if (sound === 'tap') {
    playTone(context, 520, now, 0.08, 0.05, 'triangle');
    playTone(context, 780, now + 0.04, 0.07, 0.04, 'triangle');
  } else if (sound === 'win') {
    [523, 659, 784, 1046].forEach((frequency, index) => playTone(context, frequency, now + index * 0.11, 0.18, 0.075));
  } else {
    playTone(context, 220, now, 0.22, 0.08, 'sawtooth');
    playTone(context, 165, now + 0.16, 0.28, 0.07, 'sawtooth');
  }
}

function AdContent({ ad, compact = false }: { ad: Advertisement; compact?: boolean }) {
  const content = (
    <>
      {ad.type === 'image' && ad.imageUrl && (
        <>
          <img src={imageSrc(ad.imageUrl)} alt={ad.title} className={compact ? 'mx-auto max-h-40 w-full object-contain p-2' : 'block h-auto max-h-[180px] w-full object-contain bg-white p-2 sm:max-h-[220px]'} />
          {ad.buttonText && (
            <div className="px-3 py-2 flex justify-between items-center gap-3">
              <span className="truncate text-xs text-gray-500">{ad.title}</span>
              <span className="shrink-0 text-xs font-bold text-[#1a50a0]">{ad.buttonText}</span>
            </div>
          )}
        </>
      )}
      {ad.type === 'video' && ad.videoUrl && (
        <video src={ad.videoUrl} controls className={compact ? 'mx-auto max-h-44 w-full rounded-xl bg-black' : 'w-full max-h-40 bg-black'} />
      )}
      {ad.type === 'text' && (
        <div className={compact ? 'px-4 py-3 text-center' : 'px-4 py-3 flex items-center justify-between gap-3'}>
          <p className="text-sm text-gray-700">{ad.text}</p>
          {ad.buttonText && ad.destinationUrl && !compact && (
            <span className="text-xs font-bold text-white bg-[#1a50a0] px-3 py-1 rounded-full whitespace-nowrap">{ad.buttonText}</span>
          )}
        </div>
      )}
    </>
  );

  return ad.destinationUrl ? (
    <a href={ad.destinationUrl} target="_blank" rel="noopener noreferrer" className="block">{content}</a>
  ) : <>{content}</>;
}

function AdBanner({ position, ads, showAds }: { position: Advertisement['position']; ads: Advertisement[]; showAds: boolean }) {
  if (!showAds) return null;
  const ad = store.getActiveAdsForPosition(ads, position)[0];
  if (!ad) return null;
  return <div className="w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"><AdContent ad={ad} /></div>;
}

function PopupAd({ position, ads, showAds }: { position: 'success' | 'timeout'; ads: Advertisement[]; showAds: boolean }) {
  if (!showAds) return null;
  const ad = store.getActiveAdsForPosition(ads, position)[0];
  if (!ad) return null;
  return <div className="mb-4 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/40"><AdContent ad={ad} compact /></div>;
}

function GameCard({ card, book, onClick, disabled }: { card: CardState; book: BookCover; onClick: () => void; disabled: boolean }) {
  const borderClass = card.isMatched ? 'ring-4 ring-green-500' : '';
  return (
    <div
      className={`card-scene cursor-pointer select-none ${disabled || card.isMatched ? 'cursor-default' : ''}`}
      style={{ width: '100%', paddingBottom: '130%', position: 'relative' }}
      onClick={!disabled && !card.isMatched ? onClick : undefined}
      role="button"
      aria-label={card.isFlipped ? `Book: ${book.title}` : 'Face-down card'}
      tabIndex={disabled || card.isMatched ? -1 : 0}
      onKeyDown={event => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled && !card.isMatched) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <div className={`card-inner ${card.isFlipped || card.isMatched ? 'flipped' : ''}`} style={{ width: '100%', height: '100%' }}>
          <div className={`card-face card-back bg-white flex items-center justify-center shadow-xl ${borderClass}`}>
            <img src={cardBoxLogo} alt="Sarasavi" className="h-4/5 w-4/5 object-contain" />
          </div>
          <div className={`card-face card-front bg-white shadow-md ${borderClass}`}>
            <img src={imageSrc(book.imageUrl)} alt={book.title} className="h-full w-full object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}

function WinPopup({ onNewGame, settings, countdown, ads, logo }: {
  onNewGame: () => void;
  settings: GameSettings;
  countdown: number;
  ads: Advertisement[];
  logo: string;
}) {
  const [title, description] = settings.successMessage.split('\n');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        <img src={logo} alt="Sarasavi" className="mx-auto mb-5 h-16 w-auto object-contain" />
        <h2 className="font-serif text-2xl font-bold text-[#1a50a0] mb-1">{title || 'Congratulations!'}</h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">{description}</p>
        <PopupAd position="success" ads={ads} showAds={settings.showAds} />
        <button onClick={onNewGame} className="w-full bg-[#1a50a0] hover:bg-[#143d7e] text-white font-bold py-3 rounded-xl transition-colors mb-3">Play New Game Now</button>
        {settings.autoNewGame && <p className="text-sm text-gray-400">New game starts in <span className="font-bold text-[#1a50a0]">{countdown}s</span></p>}
      </div>
    </div>
  );
}

function LosePopup({ onRetry, settings, ads, logo }: { onRetry: () => void; settings: GameSettings; ads: Advertisement[]; logo: string }) {
  const [title, description] = settings.timeoutMessage.split('\n');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        <img src={logo} alt="Sarasavi" className="mx-auto mb-5 h-16 w-auto object-contain" />
        <h2 className="font-serif text-2xl font-bold text-red-600 mb-1">{title || "Time's Up!"}</h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">{description}</p>
        <PopupAd position="timeout" ads={ads} showAds={settings.showAds} />
        <button onClick={onRetry} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors">Try Again</button>
      </div>
    </div>
  );
}

export default function GamePage() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [books, setBooks] = useState<BookCover[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [cards, setCards] = useState<CardState[]>([]);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.duration);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
  const [winCountdown, setWinCountdown] = useState(DEFAULT_SETTINGS.successScreenDuration);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const winCountRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const availableBooksRef = useRef<BookCover[]>([]);
  const matchedRef = useRef(0);
  const gameSequenceRef = useRef(0);

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (winCountRef.current) clearInterval(winCountRef.current);
    if (cardCheckRef.current) clearTimeout(cardCheckRef.current);
    timerRef.current = null;
    winCountRef.current = null;
    cardCheckRef.current = null;
  }

  const initGame = useCallback((availableBooks = availableBooksRef.current, freshSettings = settingsRef.current) => {
    gameSequenceRef.current += 1;
    clearTimers();
    const activeBooks = availableBooks.filter(book => book.active);
    const chosen = activeBooks.length > 8 ? shuffle(activeBooks).slice(0, 8) : activeBooks.slice(0, 8);
    setBooks(chosen);
    setCards(shuffle([...chosen, ...chosen]).map((book, index) => ({ id: index, bookCoverId: book.id, isFlipped: false, isMatched: false })));
    setTimeLeft(freshSettings.duration);
    setMoves(0);
    setMatched(0);
    matchedRef.current = 0;
    setFlippedIds([]);
    setIsChecking(false);
    setGameStarted(false);
    setGameOver(null);
    setWinCountdown(freshSettings.successScreenDuration);
    if (chosen.length === 8) void store.incrementStats('totalPlayed').catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    store.loadGameContent()
      .then(content => {
        if (cancelled) return;
        settingsRef.current = content.settings;
        availableBooksRef.current = content.books;
        setSettings(content.settings);
        setAds(content.ads);
        initGame(content.books, content.settings);
        setLoading(false);
      })
      .catch(error => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Unable to load game data from Firebase.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
      gameSequenceRef.current += 1;
      clearTimers();
    };
  }, [initGame]);

  function startTimer() {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(current => {
        if (current <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          if (cardCheckRef.current) clearTimeout(cardCheckRef.current);
          cardCheckRef.current = null;
          gameSequenceRef.current += 1;
          setIsChecking(false);
          playGameSound('fail', settingsRef.current.soundEffects);
          setGameOver('lose');
          void store.incrementStats('totalFailed').catch(() => undefined);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  function handleCardClick(card: CardState) {
    if (!gameStarted) {
      setGameStarted(true);
      startTimer();
    }
    if (isChecking || card.isMatched || flippedIds.includes(card.id) || flippedIds.length === 2) return;
    playGameSound('tap', settingsRef.current.soundEffects);
    const newFlipped = [...flippedIds, card.id];
    setFlippedIds(newFlipped);
    setCards(current => current.map(item => item.id === card.id ? { ...item, isFlipped: true } : item));

    if (newFlipped.length !== 2) return;
    setMoves(current => current + 1);
    setIsChecking(true);
    const [firstId] = newFlipped;
    const firstCard = cards.find(item => item.id === firstId);
    if (!firstCard) return;
    const isMatch = firstCard.bookCoverId === card.bookCoverId;
    const sequence = gameSequenceRef.current;

    cardCheckRef.current = setTimeout(() => {
      if (sequence !== gameSequenceRef.current) return;
      if (isMatch) {
        setCards(current => current.map(item => newFlipped.includes(item.id) ? { ...item, isMatched: true, isFlipped: true } : item));
        const nextMatched = matchedRef.current + 1;
        matchedRef.current = nextMatched;
        setMatched(nextMatched);
        if (nextMatched === 8) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          playGameSound('win', settingsRef.current.soundEffects);
          setGameOver('win');
          void store.incrementStats('totalCompleted').catch(() => undefined);
          if (settingsRef.current.celebrationAnimation) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#1a50a0', '#f59e0b', '#ffffff', '#16a34a'] });
          }
          if (settingsRef.current.autoNewGame) {
            let countdown = settingsRef.current.successScreenDuration;
            setWinCountdown(countdown);
            winCountRef.current = setInterval(() => {
              countdown -= 1;
              setWinCountdown(countdown);
              if (countdown <= 0) initGame();
            }, 1000);
          }
        }
      } else {
        setCards(current => current.map(item => newFlipped.includes(item.id) ? { ...item, isFlipped: false } : item));
      }
      setFlippedIds([]);
      setIsChecking(false);
      cardCheckRef.current = null;
    }, isMatch ? 300 : settingsRef.current.mismatchDuration);
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center"><div className="rounded-2xl bg-white px-6 py-4 text-sm font-bold text-[#1a50a0] shadow">Loading game data…</div></div>;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow">
          <h1 className="font-serif text-xl font-bold text-red-600">Unable to load the game</h1>
          <p className="mt-2 text-sm text-gray-600">{loadError}</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#1a50a0] px-4 py-2 text-sm font-bold text-white">Try Again</button>
        </div>
      </div>
    );
  }

  const bookMap = Object.fromEntries(books.map(book => [book.id, book]));
  const timerColor = timeLeft <= 5 ? 'text-red-600 timer-pulse' : timeLeft <= 10 ? 'text-orange-500' : 'text-[#1a50a0]';
  const notEnoughBooks = books.length < 8;
  const logo = imageSrc(settings.logoUrl) || sarasaviLogo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-32 items-center justify-center rounded-xl bg-white px-3 shadow-lg ring-1 ring-blue-100">
              <img src={logo} alt="Sarasavi" className="max-h-9 max-w-full object-contain" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-[#1a50a0] leading-tight">{settings.gameTitle}</h1>
              <p className="text-[10px] text-gray-400 hidden sm:block">{settings.instructions}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 py-5 flex flex-col gap-4">
        <AdBanner position="between" ads={ads} showAds={settings.showAds} />
        <AdBanner position="above" ads={ads} showAds={settings.showAds} />
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-center"><div className={`text-2xl font-black ${timerColor}`}>{timeLeft}s</div><div className="text-[10px] text-gray-400 uppercase tracking-wide">Time</div></div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="text-center"><div className="text-2xl font-black text-gray-700">{moves}</div><div className="text-[10px] text-gray-400 uppercase tracking-wide">Moves</div></div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="text-center"><div className="text-2xl font-black text-emerald-600">{matched}<span className="text-base font-normal text-gray-300"> /8</span></div><div className="text-[10px] text-gray-400 uppercase tracking-wide">Pairs</div></div>
          </div>
          <button onClick={() => initGame()} className="bg-[#1a50a0] hover:bg-[#143d7e] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">↺ Restart</button>
        </div>

        {notEnoughBooks ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 text-center shadow max-w-sm">
              <div className="text-4xl mb-3">📚</div>
              <h2 className="font-serif text-xl font-bold text-[#1a50a0] mb-2">Not Enough Books</h2>
              <p className="text-gray-500 text-sm">At least 8 active book covers are required before the game can start.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-3 flex-1 min-h-0">
            {cards.map(card => {
              const book = bookMap[card.bookCoverId];
              return book ? <GameCard key={card.id} card={card} book={book} onClick={() => handleCardClick(card)} disabled={isChecking || Boolean(gameOver)} /> : null;
            })}
          </div>
        )}

        <AdBanner position="below" ads={ads} showAds={settings.showAds} />
        <p className="text-center text-[10px] text-gray-400 mt-3">© {new Date().getFullYear()} Sarasavi Bookshop. All rights reserved.</p>
      </main>

      {gameOver === 'win' && <WinPopup onNewGame={() => initGame()} settings={settings} countdown={winCountdown} ads={ads} logo={logo} />}
      {gameOver === 'lose' && <LosePopup onRetry={() => initGame()} settings={settings} ads={ads} logo={logo} />}
    </div>
  );
}
