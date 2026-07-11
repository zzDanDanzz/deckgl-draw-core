import type { DefaultProps, Layer, PickingInfo, UpdateParameters } from '@deck.gl/core';
import { CompositeLayer } from '@deck.gl/core';
import { GeoJsonLayer, LineLayer, ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers';
import type { Feature, FeatureCollection, Position, Geometry } from 'geojson';
import type { ActionContext, EditableLayerProps, ModeHandler, VertexHandle, SnapOptions } from './types.js';
import { getLastVertex, getVertexHandles } from './utils/geometryUtils.js';
import { getSnappedCoordinate } from './utils/snapUtils.js';

import { DrawLineMode } from './modes/DrawLineMode.js';
import { DrawPointMode } from './modes/DrawPointMode.js';
import { DrawPolygonMode } from './modes/DrawPolygonMode.js';
import { EditVerticesMode } from './modes/EditVerticesMode.js';
import { SelectFeatureMode } from './modes/SelectFeatureMode.js';
import { DEFAULT_EDIT_STYLE } from './style.js';

const BACKGROUND_POLYGON: Position[][] = [[
  [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
]];

const defaultProps: DefaultProps<EditableLayerProps> = {
  mode: 'inactive',
  selectedFeatureIds: [],
  selectedVertexIndices: [],
  data: { type: 'FeatureCollection', features: [] },
  style: {},
  snapOptions: { enabled: true, snapToVertex: true, snapToEdge: true, snapRadius: 15 }
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
    snapCoordinate: Position | null;

    // Dragging state
    draggedVertex: { featureId: string | number | null; vertexIndex: number } | null;
    draggedFeatureId: string | number | null;
    dragStartCoordinate: Position | null;
    originalFeatureGeometry: Geometry | null;
  };

  initializeState() {
    this.state = {
      draftFeature: null,
      hoverCoordinate: null,
      snapCoordinate: null,
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
      const oldHandler = oldProps.mode && oldProps.mode !== 'inactive' ? MODE_HANDLERS[oldProps.mode] : null;
      oldHandler?.handleModeChange?.(oldProps.mode, this.actionContext);

      this.activeHandler?.handleModeChange?.(oldProps.mode, this.actionContext);

      this.setState({
        draftFeature: null,
        hoverCoordinate: null,
        snapCoordinate: null,
        draggedVertex: null,
        draggedFeatureId: null,
        dragStartCoordinate: null,
        originalFeatureGeometry: null
      });
    }
  }

  onClick(info: PickingInfo) {
    const snappedInfo = this._getEventInfoWithSnapping(info);
    return this.activeHandler?.onClick?.(snappedInfo, this.actionContext) ?? false;
  }

  onHover(info: PickingInfo) {
    const snappedInfo = this._getEventInfoWithSnapping(info);
    return this.activeHandler?.onHover?.(snappedInfo, this.actionContext) ?? false;
  }

  onDragStart(info: PickingInfo, event: unknown) {
    const snappedInfo = this._getEventInfoWithSnapping(info);
    return this.activeHandler?.onDragStart?.(snappedInfo, event, this.actionContext) ?? false;
  }

  onDrag(info: PickingInfo, event: unknown) {
    const snappedInfo = this._getEventInfoWithSnapping(info);
    return this.activeHandler?.onDrag?.(snappedInfo, event, this.actionContext) ?? false;
  }

  onDragEnd(info: PickingInfo, event: unknown) {
    const snappedInfo = this._getEventInfoWithSnapping(info);
    return this.activeHandler?.onDragEnd?.(snappedInfo, event, this.actionContext) ?? false;
  }

  private _renderBaseLayer(): Layer {
    const { mode, data, selectedFeatureIds, style = {} } = this.props;
    const { draftFeature } = this.state;

    const baseStyle = { ...DEFAULT_EDIT_STYLE.base, ...style.base };
    const selectedStyle = { ...DEFAULT_EDIT_STYLE.selected, ...style.selected };

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
          return (id !== undefined && selectedIds?.includes(id))
            ? selectedStyle.fillColor!
            : baseStyle.fillColor!;
        },
        getLineColor: (f: Feature) => {
          const id = f.id ?? f.properties?.id;
          return (id !== undefined && selectedIds?.includes(id))
            ? selectedStyle.lineColor!
            : baseStyle.lineColor!;
        },
        getPointRadius: baseStyle.pointRadius,
        getPointSize: baseStyle.pointRadius,
        getLineWidth: baseStyle.lineWidth,
        lineWidthUnits: 'pixels',
        pointRadiusUnits: 'pixels',
        updateTriggers: {
          getFillColor: [selectedFeatureIds, style.base, style.selected],
          getLineColor: [selectedFeatureIds, style.base, style.selected]
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
    const { style = {} } = this.props;

    if (!draftFeature) return null;

    const draftStyle = { ...DEFAULT_EDIT_STYLE.draft, ...style.draft };

    return new GeoJsonLayer(
      this.getSubLayerProps({
        id: 'draft-geojson',
        data: {
          type: 'FeatureCollection',
          features: [draftFeature]
        },
        pickable: false,
        getFillColor: draftStyle.fillColor,
        getLineColor: draftStyle.lineColor,
        getPointRadius: draftStyle.pointRadius,
        getLineWidth: draftStyle.lineWidth,
        lineWidthUnits: 'pixels',
        pointRadiusUnits: 'pixels'
      })
    );
  }

  private _renderGuideLine(): Layer | null {
    const { mode, style = {} } = this.props;
    const { draftFeature, hoverCoordinate } = this.state;

    if ((mode !== 'draw_line' && mode !== 'draw_polygon') || !draftFeature || !hoverCoordinate) {
      return null;
    }

    const lastVertex = getLastVertex(draftFeature);
    if (!lastVertex) return null;

    const guideStyle = { ...DEFAULT_EDIT_STYLE.guideLine, ...style.guideLine };

    type GuideLineData = { source: Position; target: Position };

    return new LineLayer(
      this.getSubLayerProps({
        id: 'guide-line',
        data: [{ source: lastVertex, target: hoverCoordinate }],
        getSourcePosition: (d: GuideLineData) => d.source,
        getTargetPosition: (d: GuideLineData) => d.target,
        getColor: guideStyle.color,
        getWidth: guideStyle.width,
        widthMinPixels: 2,
        pickable: false
      })
    );
  }

  private _renderVertexHandles(): Layer | null {
    const { mode, data, selectedFeatureIds, selectedVertexIndices, style = {} } = this.props;
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

    const vertexStyle = { ...DEFAULT_EDIT_STYLE.vertex, ...style.vertex };
    const selectedVertexStyle = { ...DEFAULT_EDIT_STYLE.selectedVertex, ...style.selectedVertex };

    return new ScatterplotLayer<VertexHandle>(
      this.getSubLayerProps({
        id: 'vertex-handles',
        data: handles,
        getPosition: (d: VertexHandle) => d.position,
        getRadius: (d: VertexHandle) => {
          const isSelected = !d.isDraft && selectedVertexIndices?.includes(d.vertexIndex);
          return isSelected ? selectedVertexStyle.radius! : vertexStyle.radius!;
        },
        radiusUnits: 'pixels',
        getFillColor: (d: VertexHandle) => {
          const isSelected = !d.isDraft && selectedVertexIndices?.includes(d.vertexIndex);
          return isSelected ? selectedVertexStyle.fillColor! : vertexStyle.fillColor!;
        },
        getLineColor: (d: VertexHandle) => {
          const isSelected = !d.isDraft && selectedVertexIndices?.includes(d.vertexIndex);
          return isSelected ? selectedVertexStyle.lineColor! : vertexStyle.lineColor!;
        },
        stroked: true,
        getLineWidth: (d: VertexHandle) => {
          const isSelected = !d.isDraft && selectedVertexIndices?.includes(d.vertexIndex);
          return isSelected ? selectedVertexStyle.lineWidth! : vertexStyle.lineWidth!;
        },
        lineWidthUnits: 'pixels',
        pickable: true,
        updateTriggers: {
          getFillColor: [selectedVertexIndices, style.vertex, style.selectedVertex],
          getLineColor: [selectedVertexIndices, style.vertex, style.selectedVertex],
          getRadius: [selectedVertexIndices, style.vertex, style.selectedVertex],
          getLineWidth: [selectedVertexIndices, style.vertex, style.selectedVertex],
          getPosition: [handles]
        }
      })
    );
  }

  private _getEventInfoWithSnapping(info: PickingInfo): PickingInfo {
    const { snapOptions, data, mode } = this.props;
    const { draggedFeatureId, draggedVertex } = this.state;

    this.setState({ snapCoordinate: null });

    const mergedOptions = {
      ...defaultProps.snapOptions,
      ...snapOptions
    } as SnapOptions;

    if (!mergedOptions.enabled || !info.coordinate) return info;

    // Prevent snapping if the layer is inactive
    if (!mode || mode === 'inactive') return info;
    // Prevent snapping on hover in 'edit_vertices'/'select_feature' mode unless actively dragging a vertex/feature
    if (mode === 'edit_vertices' && !draggedVertex) return info;
    if (mode === 'select_feature' && draggedFeatureId === null) return info;

    const snappedPos = getSnappedCoordinate(info, data.features, mergedOptions, draggedFeatureId);

    if (snappedPos) {
      this.setState({ snapCoordinate: snappedPos });
      return { ...info, coordinate: snappedPos };
    }

    return info;
  }

  private _renderSnapIndicator(): Layer | null {
    const { snapCoordinate } = this.state;
    const { style = {} } = this.props;

    if (!snapCoordinate) return null;

    const snapStyle = { ...DEFAULT_EDIT_STYLE.snapIndicator, ...style.snapIndicator };

    return new ScatterplotLayer(
      this.getSubLayerProps({
        id: 'snap-indicator',
        data: [{ position: snapCoordinate }],
        getPosition: (d: { position: Position }) => d.position,
        getRadius: snapStyle.radius,
        radiusUnits: 'pixels',
        getFillColor: snapStyle.fillColor,
        getLineColor: snapStyle.lineColor,
        stroked: true,
        getLineWidth: snapStyle.lineWidth,
        lineWidthUnits: 'pixels',
        pickable: false
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
      this._renderVertexHandles(),
      this._renderSnapIndicator()
    ].filter(Boolean) as Layer[];
  }
}