import type { Feature, FeatureCollection, Position } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { ModeHandler, ActionContext } from '../types.js';

export class EditVerticesMode implements ModeHandler {
  onClick(info: PickingInfo, context: ActionContext): boolean {
    const { object, sourceLayer } = info;
    const { onSelect, selectedFeatureIds } = context.props;

    const isVertexClick = !!(sourceLayer && sourceLayer.id.endsWith('vertex-handles') && object);
    if (isVertexClick) {
      const handle = object as any;
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

  onDragStart(info: PickingInfo, event: any, context: ActionContext): boolean {
    const { coordinate, object, sourceLayer } = info;
    if (!coordinate) return false;

    const { data } = context.props;
    const isVertexHandle = !!(sourceLayer && sourceLayer.id.endsWith('vertex-handles') && object);
    if (isVertexHandle) {
      const handle = object as any;
      const feature = data.features.find(f => {
        const fid = f.id ?? f.properties?.id;
        return fid !== undefined && fid === handle.featureId;
      });

      if (feature) {
        context.mutateState({
          draggedVertex: { featureId: handle.featureId, vertexIndex: handle.vertexIndex },
          dragStartCoordinate: coordinate as Position,
          originalFeatureGeometry: JSON.parse(JSON.stringify(feature.geometry)),
          draftFeature: JSON.parse(JSON.stringify(feature))
        });
        return true;
      }
    }
    return false;
  }

  onDrag(info: PickingInfo, event: any, context: ActionContext): boolean {
    const { draggedVertex, dragStartCoordinate, originalFeatureGeometry, draftFeature } = context.state;
    const { coordinate } = info;

    if (!coordinate || !dragStartCoordinate || !originalFeatureGeometry || !draftFeature || !draggedVertex) return false;

    const deltaLng = coordinate[0]! - dragStartCoordinate[0]!;
    const deltaLat = coordinate[1]! - dragStartCoordinate[1]!;

    const updatedGeometry = JSON.parse(JSON.stringify(originalFeatureGeometry));
    const vertexIndex = draggedVertex.vertexIndex;

    if (updatedGeometry.type === 'Point') {
      updatedGeometry.coordinates = [
        originalFeatureGeometry.coordinates[0]! + deltaLng,
        originalFeatureGeometry.coordinates[1]! + deltaLat
      ];
    } else if (updatedGeometry.type === 'LineString') {
      const origCoords = originalFeatureGeometry.coordinates;
      updatedGeometry.coordinates = origCoords.map((coord: Position, idx: number) => {
        if (idx === vertexIndex) {
          return [coord[0]! + deltaLng, coord[1]! + deltaLat];
        }
        return coord;
      });
    } else if (updatedGeometry.type === 'Polygon') {
      const ring = updatedGeometry.coordinates[0];
      if (ring) {
        const origRing = originalFeatureGeometry.coordinates[0];
        updatedGeometry.coordinates[0] = origRing.map((coord: Position, idx: number) => {
          if (idx === vertexIndex) {
            return [coord[0]! + deltaLng, coord[1]! + deltaLat];
          }
          return coord;
        });

        if (vertexIndex === 0 && updatedGeometry.coordinates[0].length > 0) {
          const len = updatedGeometry.coordinates[0].length;
          updatedGeometry.coordinates[0][len - 1] = updatedGeometry.coordinates[0][0];
        }
      }
    }

    context.mutateState({
      draftFeature: {
        ...draftFeature,
        geometry: updatedGeometry
      }
    });
    return true;
  }

  onDragEnd(info: PickingInfo, event: any, context: ActionContext): boolean {
    const { draggedVertex, draftFeature } = context.state;
    const { data, onChange } = context.props;

    if (draftFeature && draggedVertex) {
      const targetFeatureId = draggedVertex.featureId;

      const featureIdx = data.features.findIndex(f => {
        const fid = f.id ?? f.properties?.id;
        return fid !== undefined && fid === targetFeatureId;
      });

      if (featureIdx !== -1) {
        const updatedFeatures = [...data.features];
        updatedFeatures[featureIdx] = draftFeature;

        const updatedData: FeatureCollection = {
          ...data,
          features: updatedFeatures
        };

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
