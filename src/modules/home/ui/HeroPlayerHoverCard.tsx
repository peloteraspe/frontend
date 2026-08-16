import type { HeroVerifiedPlayer } from '@modules/home/model/heroVerifiedPlayer';

export default function HeroPlayerHoverCard({ player }: { player: HeroVerifiedPlayer }) {
  const handle = player.profileHandle ? `@${player.profileHandle}` : null;
  const hasDistinctName =
    handle !== null && player.name.trim().toLowerCase() !== player.profileHandle?.trim().toLowerCase();

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-30 w-max min-w-[8.5rem] max-w-[11rem] -translate-x-1/2 translate-y-1 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-left opacity-0 shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur-sm transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
    >
      <span className="block truncate text-xs font-semibold leading-4 text-slate-900">
        {hasDistinctName ? player.name : handle || player.name}
      </span>
      {hasDistinctName ? (
        <span className="mt-0.5 block truncate text-[10px] leading-4 text-slate-500">{handle}</span>
      ) : null}
      {handle ? (
        <span className="mt-1.5 block border-t border-slate-100 pt-1.5 text-[10px] font-semibold text-mulberry">
          Abrir perfil <span aria-hidden="true">→</span>
        </span>
      ) : null}
      <span
        className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white"
        aria-hidden="true"
      />
    </span>
  );
}
