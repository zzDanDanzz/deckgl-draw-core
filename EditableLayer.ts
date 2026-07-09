import type { CompositeLayerProps, DefaultProps, Layer, PickingInfo, UpdateParameters } from '@deck.gl/core';
import { CompositeLayer } from '@deck.gl/core';
import { LineLayer, PathLayer, ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers';
import type { Feature, LineString, MultiPoint, Polygon, Position } from 'geojson';
import { createLineString, createMultiPoint, createPolygon } from './utils/geojson.js';

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

  renderLayers() {
    const { mode } = this.props;
    const { activeVertices, hoverCoordinate } = this.state;
    const layers: Layer[] = [];

    // Invisible base polygon catcher
    if (mode && mode !== 'inactive') {
      layers.push(
        new SolidPolygonLayer<Position[]>(
          this.getSubLayerProps({
            id: 'drawing-background-catcher',
            data: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]],
            getPolygon: (p: Position[]) => p,
            getFillColor: [0, 0, 0, 0],
            pickable: true
          })
        )
      );
    }

    // Render polygon preview
    if (mode === 'polygon' && activeVertices.length > 0) {
      const previewVertices = hoverCoordinate
        ? [...activeVertices, hoverCoordinate]
        : activeVertices;

      // Draw fill
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

      // Draw outline
      if (previewVertices.length >= 2) {
        layers.push(
          new PathLayer<Position[]>(
            this.getSubLayerProps({
              id: 'polygon-outline',
              data: [[...previewVertices, previewVertices[0]]],
              getPath: (d: Position[]) => d,
              getColor: [255, 0, 0, 255],
              getWidth: 3,
              widthMinPixels: 2,
              pickable: false
            })
          )
        );
      }
    }

    // Render committed vertices (Points)
    if (activeVertices.length > 0) {
      layers.push(
        new ScatterplotLayer<Position>(
          this.getSubLayerProps({
            id: 'drawing-points',
            data: activeVertices,
            getPosition: (d: Position) => d,
            getRadius: 6,
            radiusUnits: 'pixels',
            getFillColor: [255, 0, 0],
            pickable: false
          })
        )
      );
    }

    // Render committed lines
    if (mode === 'line' && activeVertices.length > 1) {
      layers.push(
        new PathLayer<Position[]>(
          this.getSubLayerProps({
            id: 'drawing-committed-lines',
            data: [activeVertices], // Reference only changes on click
            getPath: (d: Position[]) => d,
            getColor: [255, 0, 0, 255],
            getWidth: 3,
            widthMinPixels: 2,
            pickable: false
          })
        )
      );
    }

    // Render floating line guide
    if (mode === 'line' && activeVertices.length > 0 && hoverCoordinate) {
      const lastVertex = activeVertices[activeVertices.length - 1];

      layers.push(
        new LineLayer<{ sourcePosition: Position, targetPosition: Position }>(
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
        )
      );
    }

    return layers;
  }
}