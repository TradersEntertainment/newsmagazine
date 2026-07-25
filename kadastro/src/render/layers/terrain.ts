import { PARCEL_SIZE, ZOOM_LOD_BLOBS } from '../../data/balance';
import { isParcelOwned, parcelSide, type World } from '../../sim/world';
import type { Camera } from '../camera';
import { PALETTE, wobble, type DrawStyle } from '../style';

/**
 * Terrain layer. Phase 0 draws the empty cadastral sheet: paper, tile rules,
 * parcel edges and fog over unbought parcels. Height, water and vegetation
 * arrive with Phase 1's generator.
 *
 * Nothing outside the camera rectangle is drawn (§17), and the tile grid drops
 * out entirely once it would be sub-pixel noise.
 */
export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  style: DrawStyle,
): void {
  ctx.fillStyle = style.paper;
  ctx.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);

  const rect = camera.visibleTileRect();
  const x0 = Math.max(0, rect.x0);
  const y0 = Math.max(0, rect.y0);
  const x1 = Math.min(world.size, rect.x1);
  const y1 = Math.min(world.size, rect.y1);
  if (x0 >= x1 || y0 >= y1) return;

  drawWorldBackdrop(ctx, world, camera);
  if (camera.zoom >= ZOOM_LOD_BLOBS) {
    drawTileRules(ctx, camera, style, x0, y0, x1, y1);
  }
  drawParcelRules(ctx, world, camera, style);
  drawFog(ctx, world, camera);
}

/** The world's own extent, so the void beyond 256×256 reads as off-sheet. */
function drawWorldBackdrop(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
): void {
  const topLeft = camera.worldToScreen(0, 0);
  const bottomRight = camera.worldToScreen(world.size, world.size);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  );
  ctx.restore();
}

function drawTileRules(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  style: DrawStyle,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  // At low zoom every tile line would collapse into grey; thin them out first.
  const step = camera.zoom < 1 ? 4 : 1;
  ctx.save();
  ctx.globalAlpha = style.ruleAlpha;
  ctx.strokeStyle = style.rule;
  ctx.lineWidth = style.ruleWidth;
  ctx.beginPath();
  const start = camera.worldToScreen(x0, y0);
  const end = camera.worldToScreen(x1, y1);

  for (let x = x0 - (x0 % step); x <= x1; x += step) {
    const sx = camera.worldToScreen(x, 0).x + wobble(x, 0, style.jitter);
    ctx.moveTo(sx, start.y);
    ctx.lineTo(sx, end.y);
  }
  for (let y = y0 - (y0 % step); y <= y1; y += step) {
    const sy = camera.worldToScreen(0, y).y + wobble(0, y, style.jitter);
    ctx.moveTo(start.x, sy);
    ctx.lineTo(end.x, sy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawParcelRules(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  style: DrawStyle,
): void {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = style.parcelRule;
  ctx.lineWidth = style.parcelWidth;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  const extent = camera.worldToScreen(world.size, world.size);
  const origin = camera.worldToScreen(0, 0);
  for (let p = 0; p <= world.size; p += PARCEL_SIZE) {
    const sx = camera.worldToScreen(p, 0).x;
    const sy = camera.worldToScreen(0, p).y;
    ctx.moveTo(sx, origin.y);
    ctx.lineTo(sx, extent.y);
    ctx.moveTo(origin.x, sy);
    ctx.lineTo(extent.x, sy);
  }
  ctx.stroke();
  ctx.restore();
}

/** Unowned parcels stay under fog (§4) — visible as land, not as content. */
function drawFog(ctx: CanvasRenderingContext2D, world: World, camera: Camera): void {
  const side = parcelSide(world);
  ctx.save();
  ctx.fillStyle = PALETTE.fog;
  ctx.globalAlpha = 0.55;
  for (let py = 0; py < side; py++) {
    for (let px = 0; px < side; px++) {
      if (isParcelOwned(world, px, py)) continue;
      const topLeft = camera.worldToScreen(px * PARCEL_SIZE, py * PARCEL_SIZE);
      const size = PARCEL_SIZE * camera.scale;
      if (
        topLeft.x > camera.viewportWidth ||
        topLeft.y > camera.viewportHeight ||
        topLeft.x + size < 0 ||
        topLeft.y + size < 0
      ) {
        continue;
      }
      ctx.fillRect(topLeft.x, topLeft.y, size, size);
    }
  }
  ctx.restore();
}
