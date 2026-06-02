"use client";

import Image from "next/image";
import { formatDate } from "@/lib/date-utils";
import { getHeroPortrait } from "@/lib/hero-portraits";

type MatchHistoryEntry = {
  id: string;
  result: string;
  createdAt: Date;
  playerTeam: string[];
  opponentTeam: string[];
  opponent: string;
  user_id: string;
};

type MatchHistoryListProps = {
  matches: MatchHistoryEntry[];
};

const RESULT_STYLES: Record<string, string> = {
  win: "bg-emerald-500/15 text-emerald-300",
  lose: "bg-rose-500/15 text-rose-300",
};

const BORDER_STYLES: Record<string, string> = {
  win: "bg-emerald-400",
  lose: "bg-rose-400",
};

export function MatchHistoryList({ matches }: MatchHistoryListProps) {
  return (
    <div className="overflow-y-auto space-y-3 p-3 sm:space-y-4 sm:p-6 lg:p-8" style={{ maxHeight: "calc(100vh - 500px)" }}>
      {matches.length > 0 ? (
        matches.map((match, index) => {
          const isWin = match.result.toLowerCase() === "win";

          return (
            <article
              key={`${match.createdAt.toString()}-${match.opponent}-${index}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#1b1824] to-[#15131d] shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
            >
              {/* Result Bar */}
              <div className={`h-1.5 w-full ${isWin ? BORDER_STYLES.win : BORDER_STYLES.lose}`} />

              <div className="p-3 sm:p-4">
                {/* Result + Date */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] sm:text-sm ${
                        RESULT_STYLES[match.result.toLowerCase()] ?? "bg-white/10 text-white"
                      }`}
                    >
                      {match.result.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#b8a98a] sm:text-sm">{formatDate(match.createdAt)}</span>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#d7c9a8] whitespace-nowrap">
                    vs {match.opponent}
                  </span>
                </div>

                {/* Teams */}
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <div className="flex flex-1 flex-wrap items-center justify-center gap-1 sm:gap-3 py-2">
                    {match.playerTeam.map((member) => (
                      <div key={member} className="relative group">
                        <Image
                          src={getHeroPortrait(member)}
                          alt={member}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-lg border-2 border-white/20 shadow-lg transition-transform group-hover:scale-110 sm:h-16 sm:w-16"
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {member}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-1 flex-wrap items-center justify-center gap-1 sm:gap-3 py-2">
                    {match.opponentTeam.map((member) => (
                      <div key={member} className="relative group">
                        <Image
                          src={getHeroPortrait(member)}
                          alt={member}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-lg border-2 border-white/20 shadow-lg transition-transform group-hover:scale-110 sm:h-16 sm:w-16"
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {member}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-[#d2c6a5] text-base">
            Aucun historique de combat. Votre premier duel apparaîtra ici.
          </p>
        </div>
      )}
    </div>
  );
}
