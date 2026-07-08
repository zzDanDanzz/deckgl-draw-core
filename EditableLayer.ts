import { CompositeLayer } from '@deck.gl/core';
import type { CompositeLayerProps, DefaultProps, Layer, PickingInfo, UpdateParameters } from '@deck.gl/core';
import { ScatterplotLayer, PathLayer, SolidPolygonLayer } from '@deck.gl/layers';
import type { Feature, LineString, MultiPoint, Position } from 'geojson';
import { createLineString, createMultiPoint } from './utils/geojson.js';

export type EditableLayerMode = 'inactive' | 'point' | 'line';

export type DrawnFeature = Feature<MultiPoint | LineString>;

export interface EditableLayerProps extends CompositeLayerProps {
  mode?: EditableLayerMode;
  onDrawComplete?: (feature: DrawnFeature) => void;
}

const defaultProps: DefaultProps<EditableLayerProps> = {
  mode: 'inactive',
  onDrawComplete: { type: 'function', value: () => { } },
  data: { type: 'array', value: [] }
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
      const feature: DrawnFeature = previousMode === 'line'
        ? createLineString(activeVertices)
        : createMultiPoint(activeVertices);


      this.props.onDrawComplete(feature);
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
    if (this.props.mode === 'line') {
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
            // TODO: what about other projections? 
            data: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]],
            getPolygon: (p: Position[]) => p,
            getFillColor: [0, 0, 0, 0],
            pickable: true
          })
        )
      );
    }

    // Render committed vertices
    if (activeVertices.length > 0) {
      layers.push(
        new ScatterplotLayer<Position>(
          this.getSubLayerProps({
            id: 'drawing-points',
            data: activeVertices,
            getPosition: (d: Position) => d,
            getRadius: 6,
            getFillColor: [255, 0, 0],
            pickable: false
          })
        )
      );
    }

    // Render the floating line guide
    if (mode === 'line' && activeVertices.length > 0 && hoverCoordinate) {
      const guideLineData: Position[][] = [[...activeVertices, hoverCoordinate]];

      layers.push(
        new PathLayer<Position[]>(
          this.getSubLayerProps({
            id: 'drawing-guide-line',
            data: guideLineData,
            getPath: (d: Position[]) => d,
            getColor: [255, 0, 0, 180],
            getWidth: 3,
            widthMinPixels: 2
          })
        )
      );
    }

    return layers;
  }
}