import { createLineString } from '../utils/geometryUtils.js';
import type { Feature, LineString, Position } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext, VertexHandle } from '../types.js';
import { produce } from 'immer';

export class DrawLineMode implements ModeHandler {
  handleModeChange(oldMode: string | undefined, context: ActionContext): void {
    if (oldMode === 'draw_line') {
      const { draftFeature } = context.state;
      const { onChange, data } = context.props;

      if (draftFeature) {
        const coords = (draftFeature.geometry as LineString).coordinates;
        if (coords.length >= 2) {
          const updatedData = produce(data, (draft) => {
            draft.features.push(draftFeature);
          });
          if (onChange) {
            onChange(updatedData, { type: 'create', features: [draftFeature] });
          }
        }
      }
    }
  }

  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { coordinate, object, sourceLayer } = info;
    if (!coordinate) return false;

    const { draftFeature } = context.state;
    const { data, onChange } = context.props;

    if (draftFeature) {
      const coords = (draftFeature.geometry as LineString).coordinates;

      const isLastVertexClick = !!(
        sourceLayer &&
        sourceLayer.id.endsWith('vertex-handles') &&
        object &&
        (object as VertexHandle).vertexIndex === coords.length - 1
      );

      if (isLastVertexClick && coords.length >= 2) {
        const updatedData = produce(data, (draft) => {
          draft.features.push(draftFeature);
        });

        context.mutateState({ draftFeature: null, hoverCoordinate: null });

        if (onChange) {
          onChange(updatedData, { type: 'create', features: [draftFeature] });
        }
        return true;
      }

      const newDraft: Feature = {
        ...draftFeature,
        geometry: {
          type: 'LineString',
          coordinates: [...coords, coordinate as Position]
        }
      };

      context.mutateState({ draftFeature: newDraft });
      return true;
    } else {
      const newDraft = createLineString([coordinate as Position]);
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

