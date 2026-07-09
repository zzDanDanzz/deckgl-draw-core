import type { Feature, Position } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { SnapOptions } from '../types.js';

const sqr = (x: number) => x * x;
const dist2 = (v: [number, number], w: [number, number]) => sqr(v[0] - w[0]) + sqr(v[1] - w[1]);

function getClosestPointOnSegment(p: [number, number], v: [number, number], w: [number, number]) {
  const l2 = dist2(v, w);
  if (l2 === 0) return { point: v, t: 0 };
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return {
    point: [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])] as [number, number],
    t // interpolation factor
  };
}

export function getSnappedCoordinate(
  info: PickingInfo,
  features: Feature[],
  options: SnapOptions,
  ignoreFeatureId?: string | number | null
): Position | null {
  if (!info.coordinate || !info.viewport || !options.enabled) return null;

  const mousePx: [number, number] = [info.x, info.y];
  let minPixelDist = options.snapRadius;
  let bestSnapCoord: Position | null = null;

  const lines: Position[][] = [];
  for (const feature of features) {
    const fid = feature.id ?? feature.properties?.id;
    if (fid !== undefined && fid === ignoreFeatureId) continue;

    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === 'LineString') lines.push(geom.coordinates);
    if (geom.type === 'Polygon') lines.push(...geom.coordinates);
    if (geom.type === 'Point') lines.push([geom.coordinates]);
  }

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const coord1 = line[i];
      if (!coord1) continue;
      const px1 = info.viewport.project(coord1 as [number, number]) as [number, number];

      if (options.snapToVertex) {
        const dist = Math.hypot(px1[0] - mousePx[0], px1[1] - mousePx[1]);
        if (dist < minPixelDist) {
          minPixelDist = dist;
          bestSnapCoord = coord1;
        }
      }

      if (options.snapToEdge && i < line.length - 1) {
        const coord2 = line[i + 1];
        if (!coord2) continue;
        const px2 = info.viewport.project(coord2 as [number, number]) as [number, number];

        const { point: closestPx, t } = getClosestPointOnSegment(mousePx, px1, px2);
        const dist = Math.hypot(closestPx[0] - mousePx[0], closestPx[1] - mousePx[1]);

        if (dist < minPixelDist) {
          minPixelDist = dist;
          // Interpolate the geographic coordinate based on 't'
          bestSnapCoord = [
            coord1[0]! + t * (coord2[0]! - coord1[0]!),
            coord1[1]! + t * (coord2[1]! - coord1[1]!)
          ];
        }
      }
    }
  }

  return bestSnapCoord;
}
