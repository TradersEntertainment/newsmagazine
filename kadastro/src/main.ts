import './style.css';
import { bindAudioUnlock } from './audio/context';
import { STR } from './data/strings.tr';
import { bindPointerInput, bindWheelZoom } from './input/pointer';
import { registerServiceWorker } from './pwa/registerSW';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { Clock } from './sim/clock';
import { creditAwayTime } from './sim/offline';
import { hashSeed } from './sim/rng';
import { createWorld, startingCentre } from './sim/world';
import { uiStore } from './state/store';
import { mountDockLabel, mountHint, mountTopBar } from './ui/topBar';

/**
 * Phase 0 bootstrap: an empty cadastral sheet you can pan and pinch at 60 fps,
 * driven by a fixed-timestep clock. No tools, no economy — those arrive with
 * their own phases. This file wires modules together and owns nothing else.
 */
const canvas = document.querySelector<HTMLCanvasElement>('#map');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Game shell missing from index.html');

const world = createWorld(hashSeed('kadastro'));
const camera = new Camera();
const renderer = new Renderer(canvas, camera);
const clock = new Clock();

const home = startingCentre(world);
camera.centreOn(home.x, home.y);
camera.setBounds({ minX: 0, minY: 0, maxX: world.size, maxY: world.size });

mountTopBar(ui);
mountHint(ui);
mountDockLabel(ui);

const input = bindPointerInput(canvas, {
  onCameraPan: (dx, dy) => camera.panByScreen(dx, dy),
  onCameraZoom: (anchorX, anchorY, factor) => camera.zoomAt(anchorX, anchorY, factor),
  onStrokeStart: () => uiStore.getState().hideHint(),
  onTap: () => uiStore.getState().hideHint(),
});
bindWheelZoom(canvas, (x, y, factor) => camera.zoomAt(x, y, factor));
bindAudioUnlock(canvas);
registerServiceWorker();

// --- Viewport plumbing -------------------------------------------------------
// Safari fires resize during the address-bar animation with stale metrics, so
// the visualViewport events matter as much as window resize here.
const handleResize = (): void => renderer.resize();
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);
window.visualViewport?.addEventListener('resize', handleResize);
window.visualViewport?.addEventListener('scroll', handleResize);
renderer.resize();

// --- Away-time bookkeeping ---------------------------------------------------
// rAF stops when the tab backgrounds, so the gap is measured on visibility
// rather than counted in frames, and handed to the offline system (§11).
let lastSeen = Date.now();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    lastSeen = Date.now();
    return;
  }
  const away = creditAwayTime(lastSeen, Date.now());
  if (away.rawMs > 1_000) {
    // Phase 4 turns this into the City Chronicle; Phase 0 only proves the
    // measurement survives a backgrounded tab.
    console.info('[kadastro] away', Math.round(away.effectiveMs / 1000), 's effective');
  }
  clock.resetAccumulators();
  lastFrame = performance.now();
  renderer.resize();
});

// --- Loop --------------------------------------------------------------------
let lastFrame = performance.now();

function frame(now: number): void {
  const deltaMs = now - lastFrame;
  lastFrame = now;

  input.tick(now);
  // Phase 0 has no systems to step yet; the budget is still consumed so the
  // fixed timestep is exercised from day one rather than bolted on later.
  clock.advance(deltaMs);

  renderer.render(world, uiStore.getState().era, deltaMs);
  publishReadout();

  requestAnimationFrame(frame);
}

let readoutAccumulator = 0;
function publishReadout(): void {
  // Store writes drive DOM updates; twice a second is plenty for diagnostics.
  readoutAccumulator += 1;
  if (readoutAccumulator < 15) return;
  readoutAccumulator = 0;
  const state = uiStore.getState();
  state.setCameraReadout(STR.camera.readout(camera.x, camera.y, camera.zoom));
  state.setFps(renderer.stats.fps);
}

requestAnimationFrame(frame);
