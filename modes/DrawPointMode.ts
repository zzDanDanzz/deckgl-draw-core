import { createPoint } from '../utils/geometryUtils.js';
import type { FeatureCollection, Position } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext } from '../types.js';

export class DrawPointMode implements ModeHandler {
  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { coordinate } = info;
    if (!coordinate) return false;

    const { data, onChange } = context.props;
    const newPoint = createPoint(coordinate as Position);
    const updatedData: FeatureCollection = {
      ...data,
      features: [...data.features, newPoint]
    };
    if (onChange) {
      onChange(updatedData, { type: 'create', features: [newPoint] });
    }
    return true;
  }
}
