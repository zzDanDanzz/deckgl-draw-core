import type { Position, Feature, LineString, MultiPoint, Polygon } from "geojson";

export const createLineString = (coords: Position[]): Feature<LineString> => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords }
});

export const createMultiPoint = (coords: Position[]): Feature<MultiPoint> => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'MultiPoint', coordinates: coords }
});

export const createPolygon = (coords: Position[][]): Feature<Polygon> => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: coords }
});