import { useCallback, useEffect, useRef, useState } from 'react';
import { DuelHud } from './components/DuelHud';
import { GameModal } from './components/GameModal';
import { TitleScreen } from './components/TitleScreen';
import { createDuelScene, DuelSceneController } from './game/SceneController';
import { soundEngine } from './game/sound';
import { CameraPreset, HudSnapshot, Move } from './game/types';

const INITIAL_SNAPSHOT: HudSnapshot = {
  screen: 'title',
  phase: 'awaiting_move',
  round: 1,
  playerAlive: true,
  botAlive: true,
  currentSlot: 0,
  bulletSlot: 0,
  remainingChambers: 6,
  shotProbability: 16.7,
  playerMove: null,
  botMove: null,
  lastOutcome: null,
  lastLoser: null,
  lastFired: null,
  headline: 'Roulette Rock-Paper-Scissors',
  subline: '1 live round in 6 chambers. Loser pulls the trigger.',
  clicksSurvived: 0,
  tiesCount: 0,
  cameraPreset: 'duel',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<DuelSceneController | null>(null);

  const [snapshot, setSnapshot] = useState<HudSnapshot>(INITIAL_SNAPSHOT);
  const [muted, setMuted] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Mount Three.js scene once in an isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = createDuelScene(mountEl, {
      onSnapshot: (next) => setSnapshot(next),
      onContextLost: (lost) => setContextLost(lost),
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleStart = useCallback(() => {
    controllerRef.current?.startMatch();
  }, []);

  const handleSelectMove = useCallback((move: Move) => {
    controllerRef.current?.submitPlayerMove(move);
  }, []);

  const handleSelectCamera = useCallback((preset: CameraPreset) => {
    controllerRef.current?.setCameraPreset(preset);
  }, []);

  const handleTogglePause = useCallback(() => {
    controllerRef.current?.togglePause();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    controllerRef.current?.returnToTitle();
  }, []);

  // Keyboard shortcuts across Title / Playing / Modal screens
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const ctrl = controllerRef.current;
      if (!ctrl) return;

      const current = ctrl.getSnapshot();

      if (key === 'm') {
        handleToggleMute();
        return;
      }

      if (key === 'h' && current.screen === 'playing') {
        setDockCollapsed((prev) => !prev);
        return;
      }

      if (key === 'c' && current.screen === 'playing') {
        ctrl.cycleCameraPreset();
        return;
      }

      if (e.key === 'Escape') {
        if (current.screen === 'playing' || current.screen === 'paused') {
          ctrl.togglePause();
        }
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (current.screen === 'title' || current.screen === 'victory' || current.screen === 'gameover') {
          e.preventDefault();
          ctrl.startMatch();
        }
        return;
      }

      if (current.screen === 'playing' && current.phase === 'awaiting_move') {
        if (key === '1' || key === 'r') {
          ctrl.submitPlayerMove(1);
        } else if (key === '2' || key === 'p') {
          ctrl.submitPlayerMove(2);
        } else if (key === '3' || key === 's') {
          ctrl.submitPlayerMove(3);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleToggleMute]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0c0f]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 h-full w-full"
        aria-label="3D Roulette Rock-Paper-Scissors Arena"
      />

      {/* WebGL Context Loss Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0b0c0f]/95 p-6 text-center">
          <div className="max-w-sm rounded-xl border border-white/15 bg-[#12141a] p-6">
            <h2 className="font-display text-xl font-bold text-[#f4f1ea]">3D Context Interrupted</h2>
            <p className="mt-2 text-xs text-[#b5b0a6]">
              Waiting for graphics context restoration. You can reload the page if rendering stays paused.
            </p>
          </div>
        </div>
      )}

      {/* Title Screen */}
      {snapshot.screen === 'title' && (
        <TitleScreen
          onStart={handleStart}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Playing HUD */}
      {snapshot.screen === 'playing' && (
        <DuelHud
          snapshot={snapshot}
          muted={muted}
          onSelectMove={handleSelectMove}
          onSelectCamera={handleSelectCamera}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          dockCollapsed={dockCollapsed}
          onToggleDock={() => setDockCollapsed((prev) => !prev)}
        />
      )}

      {/* Pause / Victory / Game Over Modal */}
      {(snapshot.screen === 'paused' ||
        snapshot.screen === 'victory' ||
        snapshot.screen === 'gameover') && (
        <GameModal
          snapshot={snapshot}
          onResume={handleTogglePause}
          onRestart={handleStart}
          onMainMenu={handleReturnToTitle}
        />
      )}
    </div>
  );
}
