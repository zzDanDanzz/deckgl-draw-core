import { createPoint } from '../utils/geometryUtils.js';
import type { FeatureCollection, Position } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext } from '../types.js';
import { produce } from 'immer';

export class DrawPointMode implements ModeHandler {
  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { coordinate } = info;
    if (!coordinate) return false;

    const { data, onChange } = context.props;
    const newPoint = createPoint(coordinate as Position);
    const updatedData = produce(data, (draft) => {
      draft.features.push(newPoint);
    });
    if (onChange) {
      onChange(updatedData, { type: 'create', features: [newPoint] });
    }
    return true;
  }
}
