import type { CompositeLayerProps, PickingInfo } from '@deck.gl/core';
import type { Feature, FeatureCollection, Position, Geometry } from 'geojson';
import type { EditableLayerStyle } from './style.js';

export type EditMode = 'inactive' | 'select_feature' | 'edit_vertices' | 'draw_line' | 'draw_polygon' | 'draw_point';
export type ActionType = 'create' | 'update' | 'delete';

export interface EditableLayerEvent {
  type: ActionType;
  features: Feature[];
}

export interface SnapOptions {
  enabled: boolean;
  snapToVertex: boolean;
  snapToEdge: boolean;
  snapRadius: number; // in pixels
}

export interface SelectedVertex {
  ringIndex: number;
  vertexIndex: number;
}

export interface EditableLayerProps extends CompositeLayerProps {
  // Core Data
  data: FeatureCollection;
  mode?: EditMode;

  // Controlled Selection State
  selectedFeatureIds?: string[] | number[];
  selectedVertexIndices?: SelectedVertex[];

  // Callbacks
  onChange?: (updatedData: FeatureCollection, event: EditableLayerEvent) => void;
  onSelect?: (selectedFeatureIds: string[] | number[], selectedVertexIndices: SelectedVertex[]) => void;

  // Style Override
  style?: EditableLayerStyle;

  // Snapping Options
  snapOptions?: Partial<SnapOptions>;
}

export interface VertexHandle {
  featureId: string | number | null;
  ringIndex: number;
  vertexIndex: number;
  position: Position;
  isDraft: boolean;
  type?: 'vertex' | 'midpoint';
}

export interface ActionContext {
  props: Readonly<EditableLayerProps>;
  state: Readonly<{
    draftFeature: Feature | null;
    hoverCoordinate: Position | null;
    draggedVertex: { featureId: string | number | null; ringIndex: number; vertexIndex: number } | null;
    draggedFeatureId: string | number | null;
    dragStartCoordinate: Position | null;
    originalFeatureGeometry: Geometry | null;
  }>;
  mutateState: (newState: Partial<ActionContext['state']>) => void;
}

export interface DeckInteractionEvent {
  stopPropagation?: () => void;
  preventDefault?: () => void;
}

export interface ModeHandler {
  handleModeChange?(oldMode: string | undefined, context: ActionContext): void;
  onClick?(info: PickingInfo, context: ActionContext): boolean;
  onHover?(info: PickingInfo, context: ActionContext): boolean;
  onDragStart?(info: PickingInfo, event: DeckInteractionEvent, context: ActionContext): boolean;
  onDrag?(info: PickingInfo, event: DeckInteractionEvent, context: ActionContext): boolean;
  onDragEnd?(info: PickingInfo, event: DeckInteractionEvent, context: ActionContext): boolean;
}

