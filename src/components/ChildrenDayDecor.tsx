type ChildrenDayBannerProps = {
  compact?: boolean;
  className?: string;
};

export function ChildrenDayBanner({ compact = false, className = '' }: ChildrenDayBannerProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 px-4 py-2 text-white shadow-sm ${className}`}>
      <div className="flex items-center justify-center gap-2 text-center">
        <span aria-hidden="true" className="text-lg leading-none">🎈</span>
        <p className={`${compact ? 'text-base' : 'text-xl sm:text-2xl'} font-extrabold tracking-wide`}>Happy Children&apos;s Day</p>
        <span aria-hidden="true" className="text-lg leading-none">🎉</span>
      </div>
    </div>
  );
}

export function ChildrenDayBackground() {
  const backgroundIcons = [
    { icon: '📚', left: '4%', top: '8%', size: '32px', delay: '0.2s', duration: '6.8s' },
    { icon: '📖', left: '15%', top: '18%', size: '30px', delay: '1.4s', duration: '7.3s' },
    { icon: '📘', left: '27%', top: '10%', size: '34px', delay: '0.9s', duration: '7.8s' },
    { icon: '📙', left: '39%', top: '22%', size: '31px', delay: '2.1s', duration: '6.6s' },
    { icon: '📕', left: '52%', top: '12%', size: '33px', delay: '1.1s', duration: '8s' },
    { icon: '📗', left: '66%', top: '20%', size: '31px', delay: '2.7s', duration: '7.1s' },
    { icon: '🧸', left: '79%', top: '11%', size: '30px', delay: '0.5s', duration: '6.9s' },
    { icon: '🪁', left: '90%', top: '22%', size: '29px', delay: '1.8s', duration: '7.7s' },
    { icon: '🧒', left: '8%', top: '35%', size: '34px', delay: '2.3s', duration: '8.1s' },
    { icon: '👧', left: '20%', top: '42%', size: '32px', delay: '1.2s', duration: '6.7s' },
    { icon: '🎨', left: '34%', top: '36%', size: '30px', delay: '2.8s', duration: '7.4s' },
    { icon: '⚽', left: '46%', top: '45%', size: '30px', delay: '0.7s', duration: '6.8s' },
    { icon: '📚', left: '58%', top: '37%', size: '33px', delay: '1.9s', duration: '7.9s' },
    { icon: '📖', left: '71%', top: '44%', size: '31px', delay: '3s', duration: '7.1s' },
    { icon: '🎠', left: '84%', top: '36%', size: '31px', delay: '0.4s', duration: '6.6s' },
    { icon: '🧸', left: '93%', top: '48%', size: '28px', delay: '2.5s', duration: '7.5s' },
    { icon: '📘', left: '6%', top: '63%', size: '32px', delay: '1s', duration: '8.2s' },
    { icon: '📗', left: '18%', top: '72%', size: '31px', delay: '2.6s', duration: '7.6s' },
    { icon: '📕', left: '31%', top: '62%', size: '33px', delay: '1.5s', duration: '6.9s' },
    { icon: '🪁', left: '44%', top: '75%', size: '29px', delay: '3.1s', duration: '7.8s' },
    { icon: '👧', left: '57%', top: '65%', size: '32px', delay: '0.8s', duration: '6.7s' },
    { icon: '🧒', left: '69%', top: '76%', size: '34px', delay: '2.2s', duration: '7.2s' },
    { icon: '🎨', left: '82%', top: '66%', size: '30px', delay: '1.7s', duration: '8.1s' },
    { icon: '⚽', left: '94%', top: '78%', size: '28px', delay: '2.9s', duration: '6.8s' },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {backgroundIcons.map((item, index) => (
        <div
          key={`${item.icon}-${index}`}
          className="children-day-floating-icon"
          style={{ left: item.left, top: item.top, fontSize: item.size, animationDelay: item.delay, animationDuration: item.duration }}
        >
          {item.icon}
        </div>
      ))}
      <div className="children-day-glow children-day-glow-one" />
      <div className="children-day-glow children-day-glow-two" />
      <div className="children-day-glow children-day-glow-three" />
      <div className="children-day-balloon children-day-balloon-one" />
      <div className="children-day-balloon children-day-balloon-two" />
      <div className="children-day-balloon children-day-balloon-three" />
      <div className="children-day-balloon children-day-balloon-four" />
      <div className="children-day-balloon children-day-balloon-five" />
      <div className="children-day-balloon children-day-balloon-six" />
      <div className="children-day-balloon children-day-balloon-seven" />
      <div className="children-day-balloon children-day-balloon-eight" />
      <div className="children-day-star children-day-star-one">★</div>
      <div className="children-day-star children-day-star-two">★</div>
      <div className="children-day-star children-day-star-three">★</div>
      <div className="children-day-star children-day-star-four">★</div>
      <div className="children-day-star children-day-star-five">★</div>
      <div className="children-day-book children-day-book-one">📚</div>
      <div className="children-day-book children-day-book-two">📖</div>
      <div className="children-day-book children-day-book-three">📘</div>
      <div className="children-day-book children-day-book-four">📕</div>
      <div className="children-day-book children-day-book-five">📙</div>
      <div className="children-day-book children-day-book-six">📗</div>
      <div className="children-day-kid children-day-kid-one">🧒</div>
      <div className="children-day-kid children-day-kid-two">👧</div>
      <div className="children-day-kid children-day-kid-three">🧸</div>
      <div className="children-day-kid children-day-kid-four">🪁</div>
      <div className="children-day-kid children-day-kid-five">🎠</div>
      <div className="children-day-kid children-day-kid-six">⚽</div>
      <div className="children-day-kid children-day-kid-seven">🎨</div>
    </div>
  );
}
