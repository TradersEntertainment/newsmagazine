import { UNDO_STACK_SIZE } from '../data/balance';
import { revertRoadChanges, type RoadChange } from './roads';
import type { GameState } from './state';

/**
 * Undo stack (§5.1). Twenty actions deep, money refunded. On a phone a wrong
 * drag is inevitable, so every destructive action has to be reversible — the
 * brief bans punishing a mis-touch (§24).
 */
export interface RoadAction {
  kind: 'road';
  changes: RoadChange[];
  /** Money spent, refunded on undo. */
  spent: number;
}

export type UndoAction = RoadAction;

export class UndoStack {
  private readonly actions: UndoAction[] = [];

  get depth(): number {
    return this.actions.length;
  }

  get canUndo(): boolean {
    return this.actions.length > 0;
  }

  push(action: UndoAction): void {
    if (action.changes.length === 0) return; // nothing happened, nothing to undo
    this.actions.push(action);
    if (this.actions.length > UNDO_STACK_SIZE) this.actions.shift();
  }

  /** Reverses the most recent action and refunds it. Returns what it undid. */
  undo(state: GameState): UndoAction | null {
    const action = this.actions.pop();
    if (!action) return null;

    revertRoadChanges(state.world, action.changes);
    state.money += action.spent;
    return action;
  }

  clear(): void {
    this.actions.length = 0;
  }
}
