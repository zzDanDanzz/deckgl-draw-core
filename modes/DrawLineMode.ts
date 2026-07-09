import { createLineString } from '../utils/geometryUtils.js';
import type { Feature, LineString, Position, FeatureCollection } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext } from '../types.js';

export class DrawLineMode implements ModeHandler {
  handleModeChange(oldMode: string | undefined, context: ActionContext): void {
    if (oldMode === 'draw_line') {
      const { draftFeature } = context.state;
      const { onChange, data } = context.props;

      if (draftFeature) {
        const coords = (draftFeature.geometry as LineString).coordinates;
        if (coords.length >= 2) {
          const updatedData: FeatureCollection = {
            ...data,
            features: [...data.features, draftFeature]
          };
          if (onChange) {
            onChange(updatedData, { type: 'create', features: [draftFeature] });
          }
        }
      }
    }
  }

  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { coordinate } = info;
    if (!coordinate) return false;

    const { draftFeature } = context.state;
    let newDraft: Feature;

    if (!draftFeature) {
      newDraft = createLineString([coordinate as Position]);
    } else {
      const coords = (draftFeature.geometry as LineString).coordinates;
      newDraft = {
        ...draftFeature,
        geometry: {
          type: 'LineString',
          coordinates: [...coords, coordinate as Position]
        }
      };
    }
    
    context.mutateState({ draftFeature: newDraft });
    return true;
  }

  onHover(info: PickingInfo, context: ActionContext): boolean {
    const { coordinate } = info;
    context.mutateState({ hoverCoordinate: (coordinate as Position) || null });
    return true;
  }
}
