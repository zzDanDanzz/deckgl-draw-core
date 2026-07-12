import type { Position, Feature, Point, LineString, Polygon, Geometry } from 'geojson';
import type { VertexHandle } from '../types.js';

export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

export const createPoint = (coords: Position, id?: string | number): Feature<Point> => ({
  type: 'Feature',
  id: id ?? generateId('point'),
  properties: {},
  geometry: { type: 'Point', coordinates: coords }
});

export const createLineString = (coords: Position[], id?: string | number): Feature<LineString> => ({
  type: 'Feature',
  id: id ?? generateId('line'),
  properties: {},
  geometry: { type: 'LineString', coordinates: coords }
});

export const createPolygon = (coords: Position[][], id?: string | number): Feature<Polygon> => ({
  type: 'Feature',
  id: id ?? generateId('polygon'),
  properties: {},
  geometry: { type: 'Polygon', coordinates: coords }
});

export const getLastVertex = (feature: Feature): Position | null => {
  if (!feature || !feature.geometry) return null;
  const geom = feature.geometry;
  if (geom.type === 'LineString') {
    const coords = geom.coordinates;
    return coords.length > 0 ? coords[coords.length - 1]! : null;
  }
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates;
    if (rings.length > 0) {
      const lastRing = rings[rings.length - 1]!;
      if (lastRing && lastRing.length > 0) {
        return lastRing[lastRing.length - 1]!;
      }
    }
  }
  return null;
};

export const getVertexHandles = (feature: Feature, isDraft: boolean): VertexHandle[] => {
  if (!feature || !feature.geometry) return [];
  const geom = feature.geometry;
  const featureId = feature.id ?? feature.properties?.id ?? null;
  const handles: VertexHandle[] = [];

  if (geom.type === 'Point') {
    handles.push({ featureId, ringIndex: 0, vertexIndex: 0, position: geom.coordinates, isDraft, type: 'vertex' });
  }
  else if (geom.type === 'LineString') {
    if (!isDraft) {
      for (let i = 0; i < geom.coordinates.length - 1; i++) {
        const p1 = geom.coordinates[i]!;
        const p2 = geom.coordinates[i + 1]!;
        handles.push({
          featureId,
          ringIndex: 0,
          vertexIndex: i + 1,
          position: [(p1[0]! + p2[0]!) / 2, (p1[1]! + p2[1]!) / 2],
          isDraft,
          type: 'midpoint'
        });
      }
    }

    geom.coordinates.forEach((coord, idx) => {
      handles.push({ featureId, ringIndex: 0, vertexIndex: idx, position: coord, isDraft, type: 'vertex' });
    });
  }
  else if (geom.type === 'Polygon') {
    geom.coordinates.forEach((ring, ringIdx) => {
      const coords = isDraft && ringIdx === geom.coordinates.length - 1 ? ring : ring.slice(0, -1);

      if (!isDraft && coords.length >= 2) {
        for (let i = 0; i < coords.length; i++) {
          const p1 = coords[i]!;
          const p2 = coords[(i + 1) % coords.length]!;
          handles.push({
            featureId,
            ringIndex: ringIdx,
            vertexIndex: i + 1,
            position: [(p1[0]! + p2[0]!) / 2, (p1[1]! + p2[1]!) / 2],
            isDraft,
            type: 'midpoint'
          });
        }
      }

      coords.forEach((coord, idx) => {
        handles.push({ featureId, ringIndex: ringIdx, vertexIndex: idx, position: coord, isDraft, type: 'vertex' });
      });
    });
  }

  return handles;
};

export const translateGeometry = <T extends Geometry>(geom: T, deltaLng: number, deltaLat: number): T => {
  const translatePos = (pos: Position): Position => [pos[0]! + deltaLng, pos[1]! + deltaLat];

  if (geom.type === 'Point') {
    return {
      ...geom,
      coordinates: translatePos((geom as Point).coordinates)
    } as unknown as T;
  }
  if (geom.type === 'LineString') {
    return {
      ...geom,
      coordinates: (geom as LineString).coordinates.map(translatePos)
    } as unknown as T;
  }
  if (geom.type === 'Polygon') {
    return {
      ...geom,
      coordinates: (geom as Polygon).coordinates.map((ring: Position[]) => ring.map(translatePos))
    } as unknown as T;
  }
  return geom;
};
