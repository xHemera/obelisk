import type { ReactNode } from "react";

type FeatureActionTileProps = {
  title: string;
  icon: string;
  accentClassName: string;
  value?: string;
  content?: ReactNode;
  onClick: () => void;
  className?: string;
};

const joinClasses = (...values: Array<string | undefined | false>) => values.filter(Boolean).join(" ");

// Atom: carte d'action principale de la Home, style JRPG lisible.
export default function FeatureActionTile({
  title,
  icon,
  accentClassName,
  value,
  content,
  onClick,
  className,
}: FeatureActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={joinClasses(
        "group relative flex h-full min-h-[100px] w-full flex-col justify-between overflow-hidden rounded-xl border border-[#c9a227]/40 bg-gradient-to-br from-[#1a1422] to-[#0f0c14] p-2 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-[#e6c55a]/70 hover:shadow-[0_12px_40px_rgba(201,162,39,0.15)] sm:min-h-[140px] sm:p-4",
        className,
      )}
    >
      <div className="pointer-events-none absolute -inset-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className={joinClasses("absolute inset-0 rounded-xl", accentClassName)} />
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span
            className="text-2xl font-black uppercase tracking-[0.14em] text-[#f5e6c8]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {title}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#c9b48a]">Active Challenge</span>
        </div>
        <i className={`fa-solid ${icon} text-lg text-[#e6c55a] drop-shadow-lg`} aria-hidden="true" />
      </div>

      {content ? <div className="relative z-10 mt-3">{content}</div> : null}

      <div className="relative z-10 flex items-center gap-2.5">
        <div className="h-px flex-1 bg-gradient-to-r from-[#e6c55a]/60 to-transparent" />
        {value ? (
          <span className="text-xs font-bold uppercase tracking-widest text-[#f0dfb1]">{value}</span>
        ) : (
          <span className="text-xs font-bold uppercase tracking-widest text-[#f0dfb1]">Begin</span>
        )}
      </div>
    </button>
  );
}
