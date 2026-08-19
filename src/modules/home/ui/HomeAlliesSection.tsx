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
        <div className="border-y border-slate-200 bg-white px-1 py-7 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[42rem]">
              <p className="text-sm font-semibold text-mulberry">Aliadas</p>
              <h2
                id="home-allies-heading"
                className="mt-2 font-eastman-extrabold text-2xl leading-tight text-slate-900 sm:text-3xl"
              >
                Organizaciones que impulsan más fútbol
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <Link
                href="/patrocinios"
                className="group home-button-micro inline-flex min-h-11 items-center gap-2 rounded-xl border border-mulberry/20 bg-white px-4 py-2 text-sm font-semibold text-mulberry hover:border-mulberry/40 hover:bg-mulberry/[0.04]"
              >
                <span>Conoce las alianzas</span>
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
