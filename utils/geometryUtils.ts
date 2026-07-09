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
    const ring = geom.coordinates[0];
    if (ring && ring.length > 0) {
      return ring[ring.length - 1]!;
    }
  }
  return null;
};

export const getVertexHandles = (feature: Feature, isDraft: boolean): VertexHandle[] => {
  if (!feature || !feature.geometry) return [];
  const geom = feature.geometry;
  const featureId = feature.id ?? feature.properties?.id ?? null;

  if (geom.type === 'Point') {
    return [{
      featureId,
      vertexIndex: 0,
      position: geom.coordinates,
      isDraft
    }];
  }
  if (geom.type === 'LineString') {
    return geom.coordinates.map((coord, idx) => ({
      featureId,
      vertexIndex: idx,
      position: coord,
      isDraft
    }));
  }
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0];
    if (!ring) return [];
    // For a committed Polygon, slice(0, -1) to avoid duplicate handles at start/end
    const coords = isDraft ? ring : ring.slice(0, -1);
    return coords.map((coord, idx) => ({
      featureId,
      vertexIndex: idx,
      position: coord,
      isDraft
    }));
  }
  return [];
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
