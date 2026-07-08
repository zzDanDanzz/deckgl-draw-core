import type { Position, Feature, LineString, MultiPoint } from "geojson";

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