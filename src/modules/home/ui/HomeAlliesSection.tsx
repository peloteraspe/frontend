import Link from 'next/link';
import AlliesCarouselEntry from '@modules/home/ui/AlliesCarouselEntry';
import HomeReveal from '@modules/home/ui/HomeReveal';
import type { HomeAlly } from '@modules/home/ui/homeContent';

export default function HomeAlliesSection({ allies }: { allies: HomeAlly[] }) {
  if (!allies.length) return null;

  return (
    <section
      className="home-scroll-target w-full"
      id="aliadxs"
      aria-labelledby="home-allies-heading"
    >
      <HomeReveal className="site-shell">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/80 px-5 py-6 shadow-[0_24px_56px_-44px_rgba(84,8,111,0.42)] backdrop-blur-sm sm:px-7 sm:py-7 lg:px-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[42rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mulberry/70">
                Con el impulso de
              </p>
              <h2
                id="home-allies-heading"
                className="mt-2 font-eastman-extrabold text-2xl leading-tight text-slate-900 sm:text-3xl"
              >
                Marcas y organizaciones que también juegan por más fútbol.
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <span className="rounded-full bg-primary/10 px-3.5 py-2 text-sm font-semibold text-slate-700">
                {allies.length} aliadxs y creciendo
              </span>
              <Link
                href="/patrocinios"
                className="group home-button-micro inline-flex min-h-11 items-center gap-2 rounded-full border border-mulberry/20 bg-white px-4 py-2 text-sm font-semibold text-mulberry hover:border-mulberry/40 hover:bg-mulberry/[0.04]"
              >
                <span>Suma tu marca</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </div>
          </div>

          <AlliesCarouselEntry allies={allies} />
        </div>
      </HomeReveal>
    </section>
  );
}
