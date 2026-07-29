import Ball from '@core/assets/images/ball.png';
import Calendar from '@core/assets/images/calendar.png';
import DoubleBall from '@core/assets/images/double-ball.png';
import Image from 'next/image';
import Link from 'next/link';
import Ubication from '@core/assets/images/ubication.png';

interface CardEventProps {
  typeEvent: string;
  levelText: string;
  matchText: string;
  dateText: string;
  textLocation: string;
  price: string;
  badge: React.ReactNode[];
  button: React.ReactNode;
  detailsHref: string;
  compact?: boolean;
  active?: boolean;
}

const CardEvent: React.FC<CardEventProps> = ({
  typeEvent,
  levelText,
  matchText,
  dateText,
  textLocation,
  price,
  badge,
  button,
  detailsHref,
  compact = false,
  active = false,
}) => {
  const eventIcon = typeEvent.toLowerCase().includes('pichanga') ? Ball : DoubleBall;

  return (
    <article
      className={[
        'premium-card group relative w-full overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:border-mulberry/20 hover:shadow-[0_28px_60px_-40px_rgba(84,8,111,0.35)] focus-within:border-mulberry/30 focus-within:shadow-[0_24px_54px_-38px_rgba(84,8,111,0.4)] sm:grid sm:items-start sm:p-6',
        compact
          ? 'sm:grid-cols-[72px_minmax(0,1fr)_148px] sm:gap-4'
          : 'sm:grid-cols-[76px_minmax(0,1fr)_176px] sm:gap-5',
        active ? '!border-mulberry/35 bg-mulberry/[0.025]' : '',
      ].join(' ')}
    >
      <Link
        href={detailsHref}
        aria-label={`Ver detalles de ${matchText}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-mulberry/20"
      />

      <div className="pointer-events-none hidden h-full items-start justify-center sm:flex">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(240,129,91,0.16)_0%,rgba(84,8,111,0.08)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <Image src={eventIcon} alt="" aria-hidden="true" width={42} height={42} />
        </div>
      </div>

      <div className="pointer-events-none min-w-0 py-0.5">
        <p className="text-xs font-bold tracking-[0.08em] text-mulberry/75">
          {levelText}
        </p>

        <h3 className="mt-2 break-words font-poppins text-lg font-bold leading-6 text-slate-900">
          {matchText}
        </h3>

        <div className="mt-3 flex min-w-0 items-start gap-2 text-sm font-medium leading-5 text-slate-600">
          <Image
            src={Calendar}
            alt=""
            aria-hidden="true"
            width={16}
            height={16}
            className="mt-0.5 shrink-0 opacity-80"
          />
          <span className="min-w-0 break-words">{dateText}</span>
        </div>

        <div className="mt-2 flex min-w-0 items-start gap-2 text-sm font-medium leading-5 text-slate-600">
          <Image
            src={Ubication}
            alt=""
            aria-hidden="true"
            width={16}
            height={16}
            className="mt-0.5 shrink-0 opacity-80"
          />
          <span className="min-w-0 break-words line-clamp-2">{textLocation}</span>
        </div>

        {badge?.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {badge.map((badgeItem, index) => (
              <div key={index} className="max-w-full">
                {badgeItem}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none relative z-20 mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4 sm:mt-0 sm:h-full sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <div className="flex min-h-10 max-w-full items-start justify-end">{button}</div>
        <p className="mt-auto whitespace-nowrap text-right font-eastman text-2xl font-bold leading-none text-mulberry sm:text-3xl">
          {price}
        </p>
      </div>
    </article>
  );
};

export default CardEvent;
