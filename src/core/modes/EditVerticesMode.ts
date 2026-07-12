import type { Feature } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext, VertexHandle, DeckInteractionEvent } from '../types.js';
import { produce } from 'immer';

const promoteMidpoint = (feature: Feature, handle: VertexHandle): Feature => {
  return produce(feature, (draft) => {
    const geom = draft.geometry;
    if (geom.type === 'LineString') {
      geom.coordinates.splice(handle.vertexIndex, 0, handle.position);
    } else if (geom.type === 'Polygon') {
      geom.coordinates[handle.ringIndex]!.splice(handle.vertexIndex, 0, handle.position);
    }
  });
};

export class EditVerticesMode implements ModeHandler {
  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { object, sourceLayer } = info;
    const { onSelect, selectedFeatureIds, data, onChange } = context.props;

    const isVertexClick = !!(sourceLayer && sourceLayer.id.endsWith('vertex-handles') && object);
    if (isVertexClick) {
      const handle = object as VertexHandle;

      // If clicking a midpoint directly without dragging, promote it immediately
      if (handle.type === 'midpoint') {
        const feature = data.features.find(f => {
          const fid = f.id ?? f.properties?.id;
          return fid !== undefined && fid === handle.featureId;
        });
        if (feature) {
          const updatedFeature = promoteMidpoint(feature, handle);
          const updatedData = produce(data, (draft) => {
            const idx = draft.features.findIndex(f => {
              const fid = f.id ?? f.properties?.id;
              return fid !== undefined && fid === handle.featureId;
            });
            if (idx !== -1) draft.features[idx] = updatedFeature;
          });

          if (onChange) {
            onChange(updatedData, { type: 'update', features: [updatedFeature] });
          }
          if (onSelect && selectedFeatureIds) {
            onSelect(selectedFeatureIds, [{ ringIndex: handle.ringIndex, vertexIndex: handle.vertexIndex }]);
          }
          return true;
        }
      }

      if (onSelect && selectedFeatureIds) {
        onSelect(selectedFeatureIds, [{ ringIndex: handle.ringIndex, vertexIndex: handle.vertexIndex }]);
      }
    } else {
      const isFeatureClick = !!(sourceLayer && sourceLayer.id.endsWith('base-geojson') && object);
      if (isFeatureClick) {
        const clickedFeature = object as Feature;
        const featureId = clickedFeature.id ?? clickedFeature.properties?.id;
        if (featureId !== undefined && onSelect) {
          if (clickedFeature.geometry.type === 'Point') {
            onSelect([featureId], [{ ringIndex: 0, vertexIndex: 0 }]);
          } else {
            onSelect([featureId], []);
          }
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

    const { data } = context.props;
    const isVertexHandle = !!(sourceLayer && sourceLayer.id.endsWith('vertex-handles') && object);

    if (isVertexHandle) {
      const handle = object as VertexHandle;
      let feature = data.features.find(f => {
        const fid = f.id ?? f.properties?.id;
        return fid !== undefined && fid === handle.featureId;
      });

      if (feature) {
        // stop panning
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();

        if (handle.type === 'midpoint') {
          feature = promoteMidpoint(feature, handle);
        }

        context.mutateState({
          draggedVertex: { featureId: handle.featureId, ringIndex: handle.ringIndex, vertexIndex: handle.vertexIndex },
          draggedFeatureId: handle.featureId,
          dragStartCoordinate: handle.position,
          originalFeatureGeometry: feature.geometry,
          draftFeature: feature
        });
        return true;
      }
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
        const rIdx = draggedVertex.ringIndex;
        const ring = geom.coordinates[rIdx];
        const origRing = origGeom.coordinates[rIdx];
        
        if (ring && origRing && origRing[vertexIndex]) {
          ring[vertexIndex] = [
            origRing[vertexIndex]![0]! + deltaLng,
            origRing[vertexIndex]![1]! + deltaLat
          ];

          if (vertexIndex === 0 && ring.length > 0) {
            const len = ring.length;
            ring[len - 1] = [...ring[0]!]; // Keep ring closed
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
