import { translateGeometry } from '../utils/geometryUtils.js';
import type { Feature, Position, Point } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext, DeckInteractionEvent } from '../types.js';
import { produce } from 'immer';

export class SelectFeatureMode implements ModeHandler {
  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { object, sourceLayer } = info;
    const { onSelect } = context.props;

    const isFeatureClick = !!(sourceLayer && sourceLayer.id.endsWith('base-geojson') && object);
    if (isFeatureClick) {
      const clickedFeature = object as Feature;
      const featureId = clickedFeature.id ?? clickedFeature.properties?.id;
      if (featureId !== undefined && onSelect) {
        onSelect([featureId], []);
      }
    } else {
      if (onSelect) {
        onSelect([], []);
      }
    }
    return true;
  }

  onDragStart(info: PickingInfo, event: DeckInteractionEvent, context: ActionContext): boolean {
    const { coordinate, object, sourceLayer } = info;
    if (!coordinate) return false;

    const { selectedFeatureIds } = context.props;
    const isBaseFeature = !!(sourceLayer && sourceLayer.id.endsWith('base-geojson') && object);

    if (isBaseFeature) {
      const clickedFeature = object as Feature;
      const featureId = clickedFeature.id ?? clickedFeature.properties?.id;
      const selectedIds = selectedFeatureIds as (string | number)[] | undefined;
      const isSelected = featureId !== undefined && selectedIds?.includes(featureId);

      if (isSelected) {
        const isPoint = clickedFeature.geometry.type === 'Point';
        const startCoord = isPoint
          ? ((clickedFeature.geometry as Point).coordinates as Position)
          : (coordinate as Position);

        // stop panning
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();

        context.mutateState({
          draggedFeatureId: featureId,
          dragStartCoordinate: startCoord,
          originalFeatureGeometry: clickedFeature.geometry,
          draftFeature: clickedFeature
        });
        return true;
      }
    }
    return false;
  }

  onDrag(info: PickingInfo, _event: DeckInteractionEvent, context: ActionContext): boolean {
    const { draggedFeatureId, dragStartCoordinate, originalFeatureGeometry, draftFeature } = context.state;
    const { coordinate } = info;

    if (!coordinate || !dragStartCoordinate || !originalFeatureGeometry || !draftFeature || draggedFeatureId === null) return false;

    const deltaLng = coordinate[0]! - dragStartCoordinate[0]!;
    const deltaLat = coordinate[1]! - dragStartCoordinate[1]!;

    const nextDraft = produce(draftFeature, (d) => {
      d.geometry = translateGeometry(originalFeatureGeometry, deltaLng, deltaLat);
    });

    context.mutateState({ draftFeature: nextDraft });
    return true;
  }

  onDragEnd(_info: PickingInfo, _event: DeckInteractionEvent, context: ActionContext): boolean {
    const { draggedFeatureId, draftFeature } = context.state;
    const { data, onChange } = context.props;

    if (draftFeature && draggedFeatureId !== null) {
      const featureIdx = data.features.findIndex(f => {
        const fid = f.id ?? f.properties?.id;
        return fid !== undefined && fid === draggedFeatureId;
      });

      if (featureIdx !== -1) {
        const updatedData = produce(data, (d) => {
          d.features[featureIdx] = draftFeature;
        });

        if (onChange) {
          onChange(updatedData, { type: 'update', features: [draftFeature] });
        }
      }
    }

    context.mutateState({
      draggedVertex: null,
      draggedFeatureId: null,
      dragStartCoordinate: null,
      originalFeatureGeometry: null,
      draftFeature: null
    });

    return true;
  }
}
