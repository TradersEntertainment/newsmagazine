import { COST_LABEL_OFFSET_PX } from '../data/balance';
import { isRoadUnlocked } from '../data/roads';
import { buildRoad, estimateRoad, removeRoad, type RoadEstimate } from '../sim/roads';
import type { GameState } from '../sim/state';
import type { RoadKind } from '../sim/tiles';
import type { UndoStack } from '../sim/undo';
import type { Camera } from '../render/camera';
import type { DraftRender } from '../render/layers/roads';
import type { TilePoint } from './pathGeometry';
import { buildRoadPath, type RoadPath } from './pathSmoothing';

/**
 * Active-tool state machine (§18). Owns the stroke in progress: it collects
 * raw finger samples, turns them into a road path, prices it live, and commits
 * on release.
 *
 * Smoothing is recomputed once per frame rather than per sample. A fast drag
 * delivers dozens of coalesced points per frame, and re-simplifying a
 * 400-tile path on each one would spend the whole budget on arithmetic the
 * player never sees.
 */
export type ToolId = 'none' | 'road' | 'erase';

export interface DraftSummary {
  mode: 'build' | 'erase';
  /** Money the affordable part of the stroke will cost. */
  cost: number;
  tiles: number;
  truncated: boolean;
  /** Screen position for the cost label, already offset above the finger. */
  labelX: number;
  labelY: number;
}

export interface ToolEvents {
  /** Fired after a road is committed, with the tiles that changed. */
  onBuilt?(tiles: readonly TilePoint[]): void;
  onChanged?(): void;
}

export class ToolController {
  private tool: ToolId = 'road';
  private roadKind: RoadKind = 'path';
  private raw: TilePoint[] = [];
  private path: RoadPath | null = null;
  private estimate: RoadEstimate | null = null;
  private dirty = false;
  private pointerScreen = { x: 0, y: 0 };
  private drawing = false;

  constructor(
    private readonly state: GameState,
    private readonly camera: Camera,
    private readonly undo: UndoStack,
    private readonly events: ToolEvents = {},
  ) {}

  get activeTool(): ToolId {
    return this.tool;
  }

  get activeRoadKind(): RoadKind {
    return this.roadKind;
  }

  get isDrawing(): boolean {
    return this.drawing;
  }

  setTool(tool: ToolId): void {
    this.cancelStroke();
    this.tool = tool;
    this.events.onChanged?.();
  }

  setRoadKind(kind: RoadKind): boolean {
    if (!isRoadUnlocked(kind, this.state.era)) return false;
    this.roadKind = kind;
    this.events.onChanged?.();
    return true;
  }

  // --- Stroke lifecycle ------------------------------------------------------

  strokeStart(screenX: number, screenY: number): void {
    if (this.tool === 'none') return;
    this.drawing = true;
    this.raw = [];
    this.addSample(screenX, screenY);
  }

  strokeMove(screenX: number, screenY: number): void {
    if (!this.drawing) return;
    this.addSample(screenX, screenY);
  }

  /** Commits the stroke. Returns the money spent. */
  strokeEnd(): number {
    if (!this.drawing) return 0;
    this.recompute();
    const path = this.path;
    this.drawing = false;

    if (!path || path.tiles.length === 0) {
      this.clearDraft();
      return 0;
    }

    const result =
      this.tool === 'erase'
        ? removeRoad(this.state.world, path.tiles)
        : buildRoad(this.state.world, path.tiles, this.roadKind, this.state.money);

    this.state.money -= result.spent;
    this.undo.push({ kind: 'road', changes: result.changes, spent: result.spent });
    if (result.changes.length > 0) {
      this.events.onBuilt?.(result.changes.map((c) => ({ x: c.x, y: c.y })));
    }

    this.clearDraft();
    this.events.onChanged?.();
    return result.spent;
  }

  cancelStroke(): void {
    this.drawing = false;
    this.clearDraft();
  }

  undoLast(): boolean {
    const action = this.undo.undo(this.state);
    if (!action) return false;
    this.events.onChanged?.();
    return true;
  }

  // --- Per-frame work --------------------------------------------------------

  /** Recomputes the smoothed path at most once per frame. */
  update(): void {
    if (this.dirty) this.recompute();
  }

  get draft(): DraftRender | null {
    const path = this.path;
    if (!path || path.tiles.length === 0) return null;
    return {
      polyline: path.polyline,
      tiles: path.tiles,
      affordableTiles: this.tool === 'erase' ? path.tiles.length : (this.estimate?.affordable ?? 0),
      kind: this.roadKind,
    };
  }

  get summary(): DraftSummary | null {
    const path = this.path;
    if (!path || path.tiles.length === 0) return null;
    return {
      mode: this.tool === 'erase' ? 'erase' : 'build',
      cost: this.tool === 'erase' ? 0 : (this.estimate?.affordableCost ?? 0),
      tiles: path.tiles.length,
      truncated: this.estimate !== null && this.estimate.truncatedAt !== -1,
      labelX: this.pointerScreen.x,
      labelY: this.pointerScreen.y - COST_LABEL_OFFSET_PX,
    };
  }

  private addSample(screenX: number, screenY: number): void {
    this.pointerScreen = { x: screenX, y: screenY };
    const world = this.camera.screenToWorld(screenX, screenY);
    this.raw.push({ x: world.x, y: world.y });
    this.dirty = true;
  }

  private recompute(): void {
    this.dirty = false;
    if (this.raw.length === 0) {
      this.path = null;
      this.estimate = null;
      return;
    }
    this.path = buildRoadPath(this.raw);
    this.estimate =
      this.tool === 'erase'
        ? null
        : estimateRoad(this.state.world, this.path.tiles, this.roadKind, this.state.money);
  }

  private clearDraft(): void {
    this.raw = [];
    this.path = null;
    this.estimate = null;
    this.dirty = false;
  }
}
