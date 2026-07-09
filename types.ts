import type { CompositeLayerProps, PickingInfo } from '@deck.gl/core';
import type { FeatureCollection, Feature, Position } from 'geojson';

export type EditMode = 'inactive' | 'select_feature' | 'edit_vertices' | 'draw_line' | 'draw_polygon' | 'draw_point';
export type ActionType = 'create' | 'update' | 'delete';

export interface EditableLayerEvent {
  type: ActionType;
  features: Feature[];
}

export interface EditableLayerProps extends CompositeLayerProps {
  // Core Data
  data: FeatureCollection;
  mode?: EditMode;

  // Controlled Selection State
  selectedFeatureIds?: string[] | number[];
  selectedVertexIndices?: number[];

  // Callbacks
  onChange?: (updatedData: FeatureCollection, event: EditableLayerEvent) => void;
  onSelect?: (selectedFeatureIds: string[] | number[], selectedVertexIndices: number[]) => void;
}

export interface VertexHandle {
  featureId: string | number | null;
  vertexIndex: number;
  position: Position;
  isDraft: boolean;
}

export interface ActionContext {
  props: Readonly<EditableLayerProps>;
  state: Readonly<{
    draftFeature: Feature | null;
    hoverCoordinate: Position | null;
    draggedVertex: { featureId: string | number | null; vertexIndex: number } | null;
    draggedFeatureId: string | number | null;
    dragStartCoordinate: Position | null;
    originalFeatureGeometry: any;
  }>;
  mutateState: (newState: Partial<ActionContext['state']>) => void;
}

export interface ModeHandler {
  handleModeChange?(oldMode: string | undefined, context: ActionContext): void;
  onClick?(info: PickingInfo, context: ActionContext): boolean;
  onHover?(info: PickingInfo, context: ActionContext): boolean;
  onDragStart?(info: PickingInfo, event: any, context: ActionContext): boolean;
  onDrag?(info: PickingInfo, event: any, context: ActionContext): boolean;
  onDragEnd?(info: PickingInfo, event: any, context: ActionContext): boolean;
}

