import type { Feature } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext, VertexHandle, DeckInteractionEvent } from '../types.js';
import { produce } from 'immer';

export class EditVerticesMode implements ModeHandler {
  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { object, sourceLayer } = info;
    const { onSelect, selectedFeatureIds } = context.props;

    const isVertexClick = !!(sourceLayer && sourceLayer.id.endsWith('vertex-handles') && object);
    if (isVertexClick) {
      const handle = object as VertexHandle;
      if (onSelect && selectedFeatureIds) {
        onSelect(selectedFeatureIds, [handle.vertexIndex]);
      }
    } else {
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
    }
    return true;
  }

  onDragStart(info: PickingInfo, event: DeckInteractionEvent, context: ActionContext): boolean {
    const { coordinate, object, sourceLayer } = info;
    if (!coordinate) return false;

    const { data, onSelect, selectedFeatureIds } = context.props;
    const isVertexHandle = !!(sourceLayer && sourceLayer.id.endsWith('vertex-handles') && object);

    if (isVertexHandle) {
      const handle = object as VertexHandle;
      const feature = data.features.find(f => {
        const fid = f.id ?? f.properties?.id;
        return fid !== undefined && fid === handle.featureId;
      });

      if (feature) {
        // stop panning
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();

        context.mutateState({
          draggedVertex: { featureId: handle.featureId, vertexIndex: handle.vertexIndex },
          draggedFeatureId: handle.featureId,
          dragStartCoordinate: handle.position,
          originalFeatureGeometry: feature.geometry,
          draftFeature: feature
        });
        return true;
      }
    }

    // Deselect feature on click outside 
    if (selectedFeatureIds && selectedFeatureIds.length > 0 && onSelect) {
      onSelect([], []);
    }

    return false;
  }

  onDrag(info: PickingInfo, _event: DeckInteractionEvent, context: ActionContext): boolean {
    const { draggedVertex, dragStartCoordinate, originalFeatureGeometry, draftFeature } = context.state;
    const { coordinate } = info;

    if (!coordinate || !dragStartCoordinate || !originalFeatureGeometry || !draftFeature || !draggedVertex) return false;

    const deltaLng = coordinate[0]! - dragStartCoordinate[0]!;
    const deltaLat = coordinate[1]! - dragStartCoordinate[1]!;
    const vertexIndex = draggedVertex.vertexIndex;

    const nextDraft = produce(draftFeature, (draft) => {
      const geom = draft.geometry;
      const origGeom = originalFeatureGeometry;

      if (geom.type === 'Point' && origGeom.type === 'Point') {
        geom.coordinates[0] = origGeom.coordinates[0]! + deltaLng;
        geom.coordinates[1] = origGeom.coordinates[1]! + deltaLat;
      } else if (geom.type === 'LineString' && origGeom.type === 'LineString') {
        geom.coordinates[vertexIndex] = [
          origGeom.coordinates[vertexIndex]![0]! + deltaLng,
          origGeom.coordinates[vertexIndex]![1]! + deltaLat
        ];
      } else if (geom.type === 'Polygon' && origGeom.type === 'Polygon') {
        const ring = geom.coordinates[0];
        const origRing = origGeom.coordinates[0];
        if (ring && origRing && origRing[vertexIndex]) {
          ring[vertexIndex] = [
            origRing[vertexIndex]![0]! + deltaLng,
            origRing[vertexIndex]![1]! + deltaLat
          ];

          if (vertexIndex === 0 && ring.length > 0) {
            const len = ring.length;
            ring[len - 1] = [...ring[0]!];
          }
        }
      }
    });

    context.mutateState({ draftFeature: nextDraft });
    return true;
  }

  onDragEnd(_info: PickingInfo, _event: DeckInteractionEvent, context: ActionContext): boolean {
    const { draggedVertex, draftFeature } = context.state;
    const { data, onChange } = context.props;

    if (draftFeature && draggedVertex) {
      const targetFeatureId = draggedVertex.featureId;

      const featureIdx = data.features.findIndex(f => {
        const fid = f.id ?? f.properties?.id;
        return fid !== undefined && fid === targetFeatureId;
      });

      if (featureIdx !== -1) {
        const updatedData = produce(data, (draft) => {
          draft.features[featureIdx] = draftFeature;
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
