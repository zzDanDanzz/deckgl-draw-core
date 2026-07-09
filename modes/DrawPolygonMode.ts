import { createPolygon } from '../utils/geometryUtils.js';
import type { Feature, Polygon, Position, FeatureCollection } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext, VertexHandle } from '../types.js';
import { produce } from 'immer';

export class DrawPolygonMode implements ModeHandler {
  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { coordinate, object, sourceLayer } = info;
    if (!coordinate) return false;

    const { draftFeature } = context.state;
    const { data, onChange } = context.props;
    const isFirstVertexClick = !!(sourceLayer && sourceLayer.id.endsWith('vertex-handles') && object && (object as VertexHandle).vertexIndex === 0);

    if (draftFeature) {
      const coords = (draftFeature.geometry as Polygon).coordinates[0];
      if (!coords) return false;

      if (isFirstVertexClick && coords.length >= 3) {
        const closedRing = [...coords, coords[0]!];
        const newPolygon: Feature = {
          ...draftFeature,
          geometry: {
            type: 'Polygon',
            coordinates: [closedRing]
          }
        };
        const updatedData = produce(data, (draft) => {
          draft.features.push(newPolygon);
        });
        context.mutateState({ draftFeature: null, hoverCoordinate: null });
        if (onChange) {
          onChange(updatedData, { type: 'create', features: [newPolygon] });
        }
        return true;
      } else {
        const newDraft: Feature = {
          ...draftFeature,
          geometry: {
            type: 'Polygon',
            coordinates: [[...coords, coordinate as Position]]
          }
        };
        context.mutateState({ draftFeature: newDraft });
        return true;
      }
    } else {
      const newDraft = createPolygon([[coordinate as Position]]);
      context.mutateState({ draftFeature: newDraft });
      return true;
    }
  }

  onHover(info: PickingInfo, context: ActionContext): boolean {
    const { coordinate } = info;
    context.mutateState({ hoverCoordinate: (coordinate as Position) || null });
    return true;
  }
}
