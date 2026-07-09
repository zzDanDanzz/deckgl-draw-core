import type { CompositeLayerProps, DefaultProps, Layer, PickingInfo, UpdateParameters } from '@deck.gl/core';
import { CompositeLayer } from '@deck.gl/core';
import { LineLayer, PathLayer, ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers';
import type { Feature, LineString, MultiPoint, Polygon, Position } from 'geojson';
import { createLineString, createMultiPoint, createPolygon } from './utils/geojson.js';

const BACKGROUND_POLYGON: Position[][] = [[
  [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
]];

export type EditableLayerMode = 'inactive' | 'point' | 'line' | 'polygon';

export type DrawnFeature = Feature<MultiPoint | LineString | Polygon>;

export interface EditableLayerProps extends CompositeLayerProps {
  mode?: EditableLayerMode;
  onDrawComplete?: (feature: DrawnFeature) => void;
}

const defaultProps: DefaultProps<EditableLayerProps> = {
  mode: 'inactive',
};


export class EditableLayer extends CompositeLayer<EditableLayerProps> {
  static layerName = 'EditableLayer';
  static defaultProps = defaultProps;

  declare state: {
    activeVertices: Position[];
    hoverCoordinate: Position | null;
  };

  initializeState() {
    this.state = {
      activeVertices: [],
      hoverCoordinate: null
    };
  }

  updateState(params: UpdateParameters<this>) {
    super.updateState(params);
    const { props, oldProps } = params;

    if (props.mode !== oldProps.mode) {
      this._flushMemory(oldProps.mode || 'inactive');
    }
  }

  _flushMemory(previousMode: EditableLayerMode) {
    const { activeVertices } = this.state;

    if (activeVertices.length > 0 && this.props.onDrawComplete) {
      let feature: DrawnFeature | null = null;

      if (previousMode === 'polygon' && activeVertices.length >= 3) {
        const closedRing = [...activeVertices, activeVertices[0]!];
        feature = createPolygon([closedRing]);
      }
      else if (previousMode === 'line' && activeVertices.length >= 2) {
        feature = createLineString(activeVertices);
      }
      else if (previousMode === 'point') {
        feature = createMultiPoint(activeVertices);
      }

      if (feature) {
        this.props.onDrawComplete(feature);
      }
    }

    this.setState({ activeVertices: [], hoverCoordinate: null });
  }

  onClick(info: PickingInfo) {
    if (this.props.mode === 'inactive') return false;

    const { coordinate } = info;
    if (!coordinate) return false;

    const { activeVertices } = this.state;

    this.setState({
      activeVertices: [...activeVertices, coordinate as Position]
    });

    return true;
  }

  onHover(info: PickingInfo) {
    if (this.props.mode === 'line' || this.props.mode === 'polygon') {
      this.setState({ hoverCoordinate: (info.coordinate as Position) || null });
      return true;
    }
    return false;
  }

  private _renderPickingOverlay(): Layer | null {
    if (this.props.mode === 'inactive') return null;

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

  private _renderPolygonFillOutline(): Layer[] {
    const { mode } = this.props;
    const { activeVertices, hoverCoordinate } = this.state;

    if (mode !== 'polygon' || activeVertices.length === 0) return [];

    const previewVertices = hoverCoordinate
      ? [...activeVertices, hoverCoordinate]
      : activeVertices;

    const layers: Layer[] = [];

    if (previewVertices.length >= 3) {
      layers.push(
        new SolidPolygonLayer<Position[]>(
          this.getSubLayerProps({
            id: 'polygon-fill',
            data: [previewVertices],
            getPolygon: (d: Position[]) => d,
            getFillColor: [255, 0, 0, 80],
            pickable: false
          })
        )
      );
    }

    if (previewVertices.length >= 2) {
      layers.push(
        new PathLayer<Position[]>(
          this.getSubLayerProps({
            id: 'polygon-outline',
            data: [[...previewVertices, previewVertices[0]!]],
            getPath: (d: Position[]) => d,
            getColor: [255, 0, 0, 255],
            getWidth: 3,
            widthMinPixels: 2,
            pickable: false
          })
        )
      );
    }

    return layers;
  }

  private _renderPoints(): Layer | null {
    const { activeVertices } = this.state;
    if (activeVertices.length === 0) return null;

    return new ScatterplotLayer<Position>(
      this.getSubLayerProps({
        id: 'drawing-points',
        data: activeVertices,
        getPosition: (d: Position) => d,
        getRadius: 6,
        radiusUnits: 'pixels',
        getFillColor: [255, 0, 0],
        pickable: false
      })
    );
  }

  private _renderLines(): Layer | null {
    const { mode } = this.props;
    const { activeVertices } = this.state;

    if (mode !== 'line' || activeVertices.length <= 1) return null;

    return new PathLayer<Position[]>(
      this.getSubLayerProps({
        id: 'drawing-committed-lines',
        data: [activeVertices],
        getPath: (d: Position[]) => d,
        getColor: [255, 0, 0, 255],
        getWidth: 3,
        widthMinPixels: 2,
        pickable: false
      })
    );
  }

  private _renderPreviewLine(): Layer | null {
    const { mode } = this.props;
    const { activeVertices, hoverCoordinate } = this.state;

    if (mode !== 'line' || activeVertices.length === 0 || !hoverCoordinate) return null;

    const lastVertex = activeVertices[activeVertices.length - 1]!;

    return new LineLayer<{ sourcePosition: Position, targetPosition: Position }>(
      this.getSubLayerProps({
        id: 'drawing-guide-line',
        data: [{ sourcePosition: lastVertex, targetPosition: hoverCoordinate }],
        getSourcePosition: (d: { sourcePosition: Position }) => d.sourcePosition,
        getTargetPosition: (d: { targetPosition: Position }) => d.targetPosition,
        getColor: [255, 0, 0, 180],
        getWidth: 3,
        widthMinPixels: 2,
        pickable: false
      })
    );
  }

  renderLayers(): Layer[] {
    if (this.props.mode === 'inactive') return [];

    return [
      this._renderPickingOverlay(),
      ...this._renderPolygonFillOutline(),
      this._renderPoints(),
      this._renderLines(),
      this._renderPreviewLine()
    ].filter(Boolean) as Layer[];
  }
}