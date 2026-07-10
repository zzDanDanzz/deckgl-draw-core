import type { Color } from '@deck.gl/core';

export interface FeatureStyle {
  fillColor?: Color;
  lineColor?: Color;
  lineWidth?: number;
  pointRadius?: number;
}

export interface VertexStyle {
  fillColor?: Color;
  lineColor?: Color;
  radius?: number;
  lineWidth?: number;
}

export interface EditableLayerStyle {
  base?: FeatureStyle;
  selected?: FeatureStyle;
  draft?: FeatureStyle;
  guideLine?: {
    color?: Color;
    width?: number;
  };
  vertex?: VertexStyle;
  selectedVertex?: VertexStyle;
  snapIndicator?: VertexStyle;
}

export const DEFAULT_EDIT_STYLE = {
  base: {
    fillColor: [0, 100, 255, 40] as Color,
    lineColor: [0, 100, 255, 200] as Color,
    lineWidth: 3,
    pointRadius: 6,
  },
  selected: {
    fillColor: [255, 120, 0, 40] as Color,
    lineColor: [255, 120, 0, 200] as Color,
    lineWidth: 3,
    pointRadius: 6,
  },
  draft: {
    fillColor: [255, 0, 0, 40] as Color,
    lineColor: [255, 0, 0, 255] as Color,
    lineWidth: 3,
    pointRadius: 6,
  },
  guideLine: {
    color: [255, 0, 0, 180] as Color,
    width: 3,
  },
  vertex: {
    fillColor: [255, 255, 255] as Color,
    lineColor: [255, 0, 0] as Color,
    radius: 6,
    lineWidth: 2,
  },
  selectedVertex: {
    fillColor: [255, 120, 0] as Color,
    lineColor: [255, 0, 0] as Color,
    radius: 6,
    lineWidth: 2,
  },
  snapIndicator: {
    fillColor: [0, 255, 0, 255] as Color,
    lineColor: [255, 255, 255, 255] as Color,
    radius: 7,
    lineWidth: 2,
  }
};
