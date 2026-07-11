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
  midpoint?: VertexStyle;
  snapIndicator?: VertexStyle;
}

const COLOR_STEEL_BLUE: Color = [25, 130, 196];
const COLOR_DUSTY_GRAPE: Color = [106, 76, 147];
const COLOR_WHITE: Color = [255, 255, 255];
const COLOR_TEAL: Color = [32, 201, 151];
const COLOR_DARK_CHARCOAL: Color = [51, 51, 51];

export const DEFAULT_EDIT_STYLE = {
  base: {
    fillColor: [...COLOR_STEEL_BLUE, 40],
    lineColor: [...COLOR_STEEL_BLUE, 200],
    lineWidth: 3,
    pointRadius: 6,
  },
  selected: {
    fillColor: [...COLOR_TEAL, 120],
    lineColor: [...COLOR_TEAL, 200],
    lineWidth: 3,
    pointRadius: 6,
  },
  draft: {
    fillColor: [...COLOR_TEAL, 120],
    lineColor: [...COLOR_TEAL, 200],
    lineWidth: 3,
    pointRadius: 6,
  },
  guideLine: {
    color: [...COLOR_TEAL, 180],
    width: 3,
  },
  vertex: {
    fillColor: COLOR_WHITE,
    lineColor: COLOR_DUSTY_GRAPE,
    radius: 6,
    lineWidth: 2,
  },
  selectedVertex: {
    fillColor: [...COLOR_DARK_CHARCOAL, 120],
    lineColor: COLOR_DARK_CHARCOAL,
    radius: 6,
    lineWidth: 2,
  },
  midpoint: {
    fillColor: [...COLOR_WHITE, 200],
    lineColor: [...COLOR_DUSTY_GRAPE, 180],
    radius: 4.5,
    lineWidth: 1.5,
  },
  snapIndicator: {
    fillColor: [...COLOR_TEAL, 255],
    lineColor: [...COLOR_WHITE, 255],
    radius: 7,
    lineWidth: 2,
  }
};
