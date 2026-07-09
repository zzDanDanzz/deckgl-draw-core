import { getLastVertex, getVertexHandles } from './utils/geometryUtils.js';
import type { DefaultProps, Layer, PickingInfo, UpdateParameters } from '@deck.gl/core';
import { CompositeLayer } from '@deck.gl/core';
import { GeoJsonLayer, LineLayer, ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers';
import type { FeatureCollection, Feature, Position } from 'geojson';
import type { EditMode, EditableLayerProps, VertexHandle, ModeHandler, ActionContext } from './types.js';

import { DrawPointMode } from './modes/DrawPointMode.js';
import { DrawLineMode } from './modes/DrawLineMode.js';
import { DrawPolygonMode } from './modes/DrawPolygonMode.js';
import { SelectFeatureMode } from './modes/SelectFeatureMode.js';
import { EditVerticesMode } from './modes/EditVerticesMode.js';

const BACKGROUND_POLYGON: Position[][] = [[
  [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
]];

const defaultProps: DefaultProps<EditableLayerProps> = {
  mode: 'inactive',
  selectedFeatureIds: [],
  selectedVertexIndices: [],
  data: { type: 'FeatureCollection', features: [] }
};

const MODE_HANDLERS: Record<string, ModeHandler> = {
  draw_point: new DrawPointMode(),
  draw_line: new DrawLineMode(),
  draw_polygon: new DrawPolygonMode(),
  select_feature: new SelectFeatureMode(),
  edit_vertices: new EditVerticesMode(),
};

export class EditableLayer extends CompositeLayer<EditableLayerProps> {
  static layerName = 'EditableLayer';
  static defaultProps = defaultProps;

  declare state: {
    draftFeature: Feature | null; // The shape currently being drawn or modified
    hoverCoordinate: Position | null; // For rendering the preview guide line

    // Dragging state
    draggedVertex: { featureId: string | number | null; vertexIndex: number } | null;
    draggedFeatureId: string | number | null;
    dragStartCoordinate: Position | null;
    originalFeatureGeometry: any;
  };

  initializeState() {
    this.state = {
      draftFeature: null,
      hoverCoordinate: null,
      draggedVertex: null,
      draggedFeatureId: null,
      dragStartCoordinate: null,
      originalFeatureGeometry: null
    };
  }

  private get activeHandler(): ModeHandler | null {
    const { mode } = this.props;
    return mode && mode !== 'inactive' ? MODE_HANDLERS[mode] ?? null : null;
  }

  private get actionContext(): ActionContext {
    return {
      props: this.props,
      state: this.state,
      mutateState: (newState) => this.setState(newState)
    };
  }

  updateState(params: UpdateParameters<this>) {
    super.updateState(params);
    const { props, oldProps } = params;

    if (props.mode !== oldProps.mode) {
      // Clean up / finalize the old mode handler if it exists
      const oldHandler = oldProps.mode && oldProps.mode !== 'inactive' ? MODE_HANDLERS[oldProps.mode] : null;
      oldHandler?.handleModeChange?.(oldProps.mode, this.actionContext);

      // Initialize the new mode handler if it exists
      this.activeHandler?.handleModeChange?.(oldProps.mode, this.actionContext);

      // Clean up base state on mode switch
      this.setState({
        draftFeature: null,
        hoverCoordinate: null,
        draggedVertex: null,
        draggedFeatureId: null,
        dragStartCoordinate: null,
        originalFeatureGeometry: null
      });
    }
  }

  onClick(info: PickingInfo) {
    return this.activeHandler?.onClick?.(info, this.actionContext) ?? false;
  }

  onHover(info: PickingInfo) {
    return this.activeHandler?.onHover?.(info, this.actionContext) ?? false;
  }

  onDragStart(info: PickingInfo, event: any) {
    return this.activeHandler?.onDragStart?.(info, event, this.actionContext) ?? false;
  }

  onDrag(info: PickingInfo, event: any) {
    return this.activeHandler?.onDrag?.(info, event, this.actionContext) ?? false;
  }

  onDragEnd(info: PickingInfo, event: any) {
    return this.activeHandler?.onDragEnd?.(info, event, this.actionContext) ?? false;
  }

  private _renderBaseLayer(): Layer {
    const { mode, data, selectedFeatureIds } = this.props;
    const { draftFeature } = this.state;

    const draftId = draftFeature?.id ?? draftFeature?.properties?.id;
    const baseFeatures = draftId !== undefined
      ? data.features.filter(f => (f.id ?? f.properties?.id) !== draftId)
      : data.features;

    const baseData: FeatureCollection = {
      ...data,
      features: baseFeatures
    };

    const isPickable = mode === 'select_feature' || mode === 'edit_vertices';
    const selectedIds = selectedFeatureIds as (string | number)[] | undefined;

    return new GeoJsonLayer(
      this.getSubLayerProps({
        id: 'base-geojson',
        data: baseData,
        pickable: isPickable,
        getFillColor: (f: Feature) => {
          const id = f.id ?? f.properties?.id;
          const isSelected = id !== undefined && selectedIds?.includes(id);
          return isSelected ? [255, 120, 0, 40] : [0, 100, 255, 40];
        },
        getLineColor: (f: Feature) => {
          const id = f.id ?? f.properties?.id;
          const isSelected = id !== undefined && selectedIds?.includes(id);
          return isSelected ? [255, 120, 0, 200] : [0, 100, 255, 200];
        },
        getPointRadius: 6,
        getPointSize: 6,
        getLineWidth: 3,
        lineWidthUnits: 'pixels',
        pointRadiusUnits: 'pixels',
        updateTriggers: {
          getFillColor: [selectedFeatureIds],
          getLineColor: [selectedFeatureIds]
        }
      })
    );
  }

  private _renderPickingOverlay(): Layer | null {
    const { mode } = this.props;
    if (mode !== 'draw_point' && mode !== 'draw_line' && mode !== 'draw_polygon') {
      return null;
    }

    return new SolidPolygonLayer<Position[]>(
      this.getSubLayerProps({
        id: 'drawing-background-catcher',
        data: [BACKGROUND_POLYGON],
        getPolygon: (p: Position[]) => p,
        getFillColor: [0, 0, 0, 0],
        pickable: true
      })
    );
  }

  private _renderDraftLayer(): Layer | null {
    const { draftFeature } = this.state;
    if (!draftFeature) return null;

    return new GeoJsonLayer(
      this.getSubLayerProps({
        id: 'draft-geojson',
        data: {
          type: 'FeatureCollection',
          features: [draftFeature]
        },
        pickable: false,
        getFillColor: [255, 0, 0, 40],
        getLineColor: [255, 0, 0, 255],
        getPointRadius: 6,
        getLineWidth: 3,
        lineWidthUnits: 'pixels',
        pointRadiusUnits: 'pixels'
      })
    );
  }

  private _renderGuideLine(): Layer | null {
    const { mode } = this.props;
    const { draftFeature, hoverCoordinate } = this.state;

    if ((mode !== 'draw_line' && mode !== 'draw_polygon') || !draftFeature || !hoverCoordinate) {
      return null;
    }

    const lastVertex = getLastVertex(draftFeature);
    if (!lastVertex) return null;

    return new LineLayer(
      this.getSubLayerProps({
        id: 'guide-line',
        data: [{ source: lastVertex, target: hoverCoordinate }],
        getSourcePosition: (d: any) => d.source,
        getTargetPosition: (d: any) => d.target,
        getColor: [255, 0, 0, 180],
        getWidth: 3,
        widthMinPixels: 2,
        pickable: false
      })
    );
  }

  private _renderVertexHandles(): Layer | null {
    const { mode, data, selectedFeatureIds, selectedVertexIndices } = this.props;
    const { draftFeature } = this.state;

    const handles: VertexHandle[] = [];

    if (mode === 'draw_line' || mode === 'draw_polygon') {
      if (draftFeature) {
        handles.push(...getVertexHandles(draftFeature, true));
      }
    } else if (mode === 'edit_vertices') {
      if (draftFeature) {
        handles.push(...getVertexHandles(draftFeature, false));
      } else if (selectedFeatureIds && selectedFeatureIds.length > 0) {
        const selectedIds = selectedFeatureIds as (string | number)[] | undefined;
        for (const feature of data.features) {
          const fid = feature.id ?? feature.properties?.id;
          if (fid !== undefined && selectedIds?.includes(fid)) {
            handles.push(...getVertexHandles(feature, false));
          }
        }
      }
    }

    if (handles.length === 0) return null;

    return new ScatterplotLayer<VertexHandle>(
      this.getSubLayerProps({
        id: 'vertex-handles',
        data: handles,
        getPosition: (d: VertexHandle) => d.position,
        getRadius: 6,
        radiusUnits: 'pixels',
        getFillColor: (d: VertexHandle) => {
          const isSelected = !d.isDraft && selectedVertexIndices?.includes(d.vertexIndex);
          return isSelected ? [255, 120, 0] : [255, 255, 255];
        },
        getLineColor: [255, 0, 0],
        stroked: true,
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        pickable: true,
        updateTriggers: {
          getFillColor: [selectedVertexIndices],
          getPosition: [handles]
        }
      })
    );
  }

  renderLayers(): Layer[] {
    const { mode } = this.props;
    if (!mode || mode === 'inactive') {
      return [this._renderBaseLayer()];
    }

    return [
      this._renderBaseLayer(),
      this._renderPickingOverlay(),
      this._renderDraftLayer(),
      this._renderGuideLine(),
      this._renderVertexHandles()
    ].filter(Boolean) as Layer[];
  }
}