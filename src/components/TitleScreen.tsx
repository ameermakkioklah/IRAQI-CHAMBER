import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  muted,
  onToggleMute,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10">
      {/* Subtle left vignette scrim for effortless headline legibility without obscuring the 3D revolver */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 w-full max-w-xl bg-gradient-to-r from-[#0b0c0f]/90 via-[#0b0c0f]/55 to-transparent"
      />

      {/* Top Bar: Audio Toggle */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs font-mono tracking-wider text-[#d4a853]/80">
          <span>SIX CHAMBERS</span>
          <span aria-hidden="true">·</span>
          <span>ONE LIVE ROUND</span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0e1014]/90 px-3 py-2 text-xs font-medium text-[#e6e1d6] transition-colors hover:border-[#d4a853]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d4a853] whitespace-nowrap shrink-0"
        >
          {muted ? <VolumeX className="h-4 w-4 text-[#d4a853]" /> : <Volume2 className="h-4 w-4 text-[#d4a853]" />}
          <span>{muted ? 'Audio Off' : 'Audio On'}</span>
        </button>
      </div>

      {/* Main Lockup in calm left negative space */}
      <div className="relative z-10 max-w-md my-auto">
        <div className="mb-5 inline-flex items-center gap-3">
          {/* Bespoke inline SVG Revolver Cylinder Lockup */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="24" cy="24" r="21" stroke="#d4a853" strokeWidth="1.5" strokeOpacity="0.85" />
            <circle cx="24" cy="24" r="4" fill="#d4a853" />
            <circle cx="24" cy="11" r="3.6" fill="#d4a853" fillOpacity="0.95" />
            <circle cx="35.2" cy="17.5" r="3.6" stroke="#e6e1d6" strokeWidth="1.4" strokeOpacity="0.5" />
            <circle cx="35.2" cy="30.5" r="3.6" stroke="#e6e1d6" strokeWidth="1.4" strokeOpacity="0.5" />
            <circle cx="24" cy="37" r="3.6" stroke="#e6e1d6" strokeWidth="1.4" strokeOpacity="0.5" />
            <circle cx="12.8" cy="30.5" r="3.6" stroke="#e6e1d6" strokeWidth="1.4" strokeOpacity="0.5" />
            <circle cx="12.8" cy="17.5" r="3.6" stroke="#e6e1d6" strokeWidth="1.4" strokeOpacity="0.5" />
          </svg>
          <span className="font-mono text-xs tracking-[0.2em] text-[#d4a853]">
            ROULETTE DUEL
          </span>
        </div>

        <h1
          className="font-display text-4xl font-bold tracking-tight text-[#f7f4ec] md:text-6xl leading-[1.06]"
          style={{ textWrap: 'balance' }}
        >
          Chamber &amp; Hand
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-[#c6c2b8] md:text-base max-w-sm">
          Outsmart the clockwork automaton in Rock-Paper-Scissors. Every round lost forces a pull of the 6-chamber revolver.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            className="pointer-events-auto inline-flex items-center justify-center rounded-lg bg-[#d4a853] px-7 py-3.5 text-sm font-semibold tracking-wide text-[#0b0c0f] shadow-lg transition-transform duration-150 hover:bg-[#e2b965] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f1ea] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Enter the Duel
          </button>
          <span className="font-mono text-xs text-[#a5a095] whitespace-nowrap">
            Press Enter or Space
          </span>
        </div>
      </div>

      {/* Single Flat Control-Hint Line */}
      <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[#9b968b]">
        <span>Click 3D Tokens or 1 · 2 · 3</span>
        <span aria-hidden="true">·</span>
        <span>C Camera</span>
        <span aria-hidden="true">·</span>
        <span>H Toggle Dock</span>
        <span aria-hidden="true">·</span>
        <span>Esc Pause</span>
      </div>
    </div>
  );
};
