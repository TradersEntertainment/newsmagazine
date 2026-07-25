import { ROAD_SPECS, ROAD_TIERS, isRoadUnlocked } from '../data/roads';
import { STR } from '../data/strings.tr';
import type { ToolController, ToolId } from '../input/tools';
import type { Era, RoadKind } from '../sim/tiles';
import * as haptics from './haptics';

/**
 * Bottom tool bar and its sheet (§14.4). Tapping a tool raises a bottom sheet
 * with that tool's options; a full-screen menu never opens. Every control sits
 * in the thumb zone and clears the 44 px minimum touch target.
 *
 * Locked road tiers are shown, not hidden — the brief wants the player to see
 * what is coming and what unlocks it (§1).
 */
export interface DockDeps {
  tools: ToolController;
  era: () => Era;
  onUndo: () => void;
}

export interface DockHandle {
  /** Closes the sheet; the map calls this when the player starts drawing. */
  closeSheet(): void;
  dispose(): void;
}

export function mountToolDock(root: HTMLElement, deps: DockDeps): DockHandle {
  const dock = root.querySelector<HTMLElement>('#tool-dock');
  const sheet = root.querySelector<HTMLElement>('#tool-sheet');
  if (!dock || !sheet) throw new Error('Tool dock markup missing');

  dock.textContent = '';
  const roadButton = toolButton(STR.tools.road);
  const eraseButton = toolButton(STR.tools.erase);
  const undoButton = toolButton(STR.tools.undo);
  dock.append(roadButton, eraseButton, spacer(), undoButton);

  const refresh = (): void => {
    const tool = deps.tools.activeTool;
    roadButton.dataset['active'] = String(tool === 'road');
    eraseButton.dataset['active'] = String(tool === 'erase');
    roadButton.textContent = `${STR.tools.road} · ${STR.road[deps.tools.activeRoadKind]}`;
  };

  const closeSheet = (): void => {
    sheet.dataset['open'] = 'false';
    sheet.setAttribute('aria-hidden', 'true');
  };

  const openRoadSheet = (): void => {
    sheet.textContent = '';
    sheet.append(sheetTitle(STR.tools.roadSheetTitle));

    for (const kind of ROAD_TIERS) {
      sheet.append(roadRow(kind, deps, refresh, closeSheet));
    }
    sheet.dataset['open'] = 'true';
    sheet.setAttribute('aria-hidden', 'false');
  };

  const selectTool = (tool: ToolId, openSheet: boolean): void => {
    haptics.tap();
    if (deps.tools.activeTool === tool && openSheet) {
      // Second tap on the active tool toggles its sheet.
      if (sheet.dataset['open'] === 'true') closeSheet();
      else openRoadSheet();
      return;
    }
    deps.tools.setTool(tool);
    if (openSheet) openRoadSheet();
    else closeSheet();
    refresh();
  };

  roadButton.addEventListener('click', () => selectTool('road', true));
  eraseButton.addEventListener('click', () => selectTool('erase', false));
  undoButton.addEventListener('click', () => {
    haptics.tap();
    deps.onUndo();
  });

  refresh();
  return {
    closeSheet,
    dispose: () => {
      dock.textContent = '';
      sheet.textContent = '';
    },
  };
}

function roadRow(
  kind: RoadKind,
  deps: DockDeps,
  refresh: () => void,
  closeSheet: () => void,
): HTMLElement {
  const spec = ROAD_SPECS[kind];
  const unlocked = isRoadUnlocked(kind, deps.era());

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'sheet-row';
  row.dataset['locked'] = String(!unlocked);
  row.disabled = !unlocked;

  const name = document.createElement('span');
  name.className = 'sheet-row-name';
  name.textContent = STR.road[kind];

  const meta = document.createElement('span');
  meta.className = 'sheet-row-meta mono';
  meta.textContent = unlocked
    ? `${STR.format.money(spec.cost)}/kare`
    : STR.lockedAt(STR.era[spec.unlockedAt]);

  row.append(name, meta);
  row.addEventListener('click', () => {
    if (!deps.tools.setRoadKind(kind)) return;
    haptics.tap();
    refresh();
    closeSheet();
  });
  return row;
}

function toolButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tool-button';
  button.textContent = label;
  return button;
}

function spacer(): HTMLElement {
  const element = document.createElement('span');
  element.className = 'dock-spacer';
  return element;
}

function sheetTitle(text: string): HTMLElement {
  const title = document.createElement('div');
  title.className = 'sheet-title';
  title.textContent = text;
  return title;
}
