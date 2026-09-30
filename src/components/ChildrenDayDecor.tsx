type ChildrenDayBannerProps = {
  compact?: boolean;
  className?: string;
};

export function ChildrenDayBanner({ compact = false, className = '' }: ChildrenDayBannerProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 px-4 py-2 text-white shadow-sm ${className}`}>
      <div className="flex items-center justify-center gap-2 text-center">
        <span aria-hidden="true" className="text-lg leading-none">🎈</span>
        <p className={`${compact ? 'text-sm' : 'text-base'} font-extrabold tracking-wide`}>Happy Children&apos;s Day</p>
        <span aria-hidden="true" className="text-lg leading-none">🎉</span>
      </div>
    </div>
  );
}

export function ChildrenDayBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="children-day-glow children-day-glow-one" />
      <div className="children-day-glow children-day-glow-two" />
      <div className="children-day-glow children-day-glow-three" />
      <div className="children-day-balloon children-day-balloon-one" />
      <div className="children-day-balloon children-day-balloon-two" />
      <div className="children-day-balloon children-day-balloon-three" />
      <div className="children-day-balloon children-day-balloon-four" />
      <div className="children-day-star children-day-star-one">★</div>
      <div className="children-day-star children-day-star-two">★</div>
      <div className="children-day-star children-day-star-three">★</div>
    </div>
  );
}
