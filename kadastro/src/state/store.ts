import { createStore } from 'zustand/vanilla';
import { STARTING_MONEY, STARTING_TAX_RATE, HAPPINESS_START } from '../data/balance';
import type { Era } from '../sim/tiles';

/**
 * UI-facing state only (§2). The simulation keeps its own plain-object state
 * and pushes summaries here; nothing under src/sim imports this store.
 */
export type ToolId = 'none' | 'road' | 'zone' | 'service' | 'inspect';
export type OverlayId = 'none' | 'traffic' | 'pollution' | 'landValue' | 'services';

export interface UiState {
  era: Era;
  money: number;
  population: number;
  happiness: number;
  taxRate: number;
  activeTool: ToolId;
  overlay: OverlayId;
  /** Diagnostics strip; Phase 0 uses it to prove the frame budget. */
  fps: number;
  cameraReadout: string;
  hintVisible: boolean;
}

export interface SimSnapshot {
  era: Era;
  money: number;
  population: number;
  happiness: number;
  taxRate: number;
}

export interface UiActions {
  /** Push of the sim's public numbers; the store never reads sim state itself. */
  syncFromSim(snapshot: SimSnapshot): void;
  setEra(era: Era): void;
  setTool(tool: ToolId): void;
  setOverlay(overlay: OverlayId): void;
  setFps(fps: number): void;
  setCameraReadout(text: string): void;
  hideHint(): void;
}

export const uiStore = createStore<UiState & UiActions>()((set) => ({
  era: 'founding',
  money: STARTING_MONEY,
  population: 0,
  happiness: HAPPINESS_START,
  taxRate: STARTING_TAX_RATE,
  activeTool: 'none',
  overlay: 'none',
  fps: 0,
  cameraReadout: '',
  hintVisible: true,

  syncFromSim: (snapshot) =>
    set((current) =>
      current.money === snapshot.money &&
      current.era === snapshot.era &&
      current.population === snapshot.population &&
      current.happiness === snapshot.happiness &&
      current.taxRate === snapshot.taxRate
        ? current
        : { ...current, ...snapshot },
    ),
  setEra: (era) => set({ era }),
  setTool: (activeTool) => set({ activeTool }),
  setOverlay: (overlay) => set({ overlay }),
  setFps: (fps) => set({ fps }),
  setCameraReadout: (cameraReadout) => set({ cameraReadout }),
  hideHint: () => set({ hintVisible: false }),
}));

export type UiStore = typeof uiStore;
