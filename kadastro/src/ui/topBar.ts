import { STR } from '../data/strings.tr';
import { uiStore } from '../state/store';

/**
 * The thin top strip (§14.4). Money counts up or down over 250 ms rather than
 * snapping, and flashes brass on a gain, brick on a loss (§14.5) — the only
 * feedback the player gets that a road actually cost something.
 */
const COUNTER_MS = 250;

export function mountTopBar(root: HTMLElement): () => void {
  const moneyElement = root.querySelector<HTMLElement>('#hud-money');
  const readout = root.querySelector<HTMLElement>('#hud-camera');
  if (!moneyElement || !readout) throw new Error('Top bar markup missing');

  let shown = uiStore.getState().money;
  let target = shown;
  let from = shown;
  let startedAt = 0;
  let animating = false;
  let lastReadout = '';

  const reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const step = (now: number): void => {
    const t = Math.min(1, (now - startedAt) / COUNTER_MS);
    const eased = 1 - (1 - t) ** 3; // ease-out cubic
    shown = from + (target - from) * eased;
    moneyElement.textContent = STR.format.money(shown);
    if (t < 1) requestAnimationFrame(step);
    else animating = false;
  };

  const paint = (): void => {
    const state = uiStore.getState();

    if (state.money !== target) {
      const gained = state.money > target;
      from = shown;
      target = state.money;
      moneyElement.dataset['delta'] = gained ? 'gain' : 'loss';
      // Let the flash clear itself; a permanent tint would read as a warning.
      window.setTimeout(() => delete moneyElement.dataset['delta'], COUNTER_MS * 2);

      if (reducedMotion) {
        shown = target;
        moneyElement.textContent = STR.format.money(shown);
      } else if (!animating) {
        animating = true;
        startedAt = performance.now();
        requestAnimationFrame(step);
      } else {
        startedAt = performance.now();
      }
    }

    const text = state.fps > 0 ? `${state.cameraReadout} · ${state.fps.toFixed(0)} fps` : state.cameraReadout;
    if (text !== lastReadout) {
      readout.textContent = text;
      lastReadout = text;
    }
  };

  moneyElement.textContent = STR.format.money(shown);
  paint();
  return uiStore.subscribe(paint);
}

/** The invitation copy fades out as soon as the player draws something. */
export function mountHint(root: HTMLElement): () => void {
  const hint = root.querySelector<HTMLElement>('#hint');
  if (!hint) throw new Error('#hint missing');
  hint.textContent = STR.empty.noRoads;

  return uiStore.subscribe(() => {
    hint.dataset['hidden'] = uiStore.getState().hintVisible ? 'false' : 'true';
  });
}
