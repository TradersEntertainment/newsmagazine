import { STR } from '../data/strings.tr';
import { uiStore } from '../state/store';

/**
 * The thin top strip (§14.4). Phase 0 shows only the camera/fps readout;
 * money, population and happiness attach in Phase 2 when they exist.
 *
 * Subscribes to the store rather than being polled, and writes only when the
 * text actually changes — DOM writes every frame would eat the budget.
 */
export function mountTopBar(root: HTMLElement): () => void {
  const readout = root.querySelector<HTMLElement>('#hud-camera');
  if (!readout) throw new Error('#hud-camera missing');

  let last = '';
  const paint = (): void => {
    const { cameraReadout, fps } = uiStore.getState();
    const text = fps > 0 ? `${cameraReadout} · ${fps.toFixed(0)} fps` : cameraReadout;
    if (text !== last) {
      readout.textContent = text;
      last = text;
    }
  };

  paint();
  return uiStore.subscribe(paint);
}

/** The invitation copy fades out as soon as the player touches the map. */
export function mountHint(root: HTMLElement): () => void {
  const hint = root.querySelector<HTMLElement>('#hint');
  if (!hint) throw new Error('#hint missing');
  hint.textContent = STR.empty.noRoads;

  return uiStore.subscribe(() => {
    hint.dataset['hidden'] = uiStore.getState().hintVisible ? 'false' : 'true';
  });
}

export function mountDockLabel(root: HTMLElement): void {
  const label = root.querySelector<HTMLElement>('.dock-label');
  if (label) label.textContent = STR.phaseLabel;
}
