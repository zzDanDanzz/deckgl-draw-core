# @zzdandanzz/deckgl-draw

A lightweight, developer-friendly, plug-and-play drawing library for Deck.gl.

[![npm version](https://img.shields.io/npm/v/@zzdandanzz/deckgl-draw?style=flat-square&color=3388ff)](https://www.npmjs.com/package/@zzdandanzz/deckgl-draw)
[![license](https://img.shields.io/github/license/zzdandanzz/deckgl-draw?style=flat-square)](https://github.com/zzdandanzz/deckgl-draw/blob/main/LICENSE)

https://github.com/user-attachments/assets/a1cd2355-b0bc-4673-9a4e-e0ef00d04351

Inspired by the simplicity of `mapbox-gl-draw`, this library provides an opinionated, easy-to-use React component and Deck.gl layer to enable drawing and editing of basic geometries with minimal configuration.

## ✨ Features

- **Plug-and-Play Architecture**: Easily integrate drawing capabilities into your Deck.gl map without digging into complex layer states.
- **Core Geometries**: Create and edit Points, LineStrings, and Polygons.
- **Built-in React UI**: Includes a fully styled, customizable `DrawToolbar` component out of the box.
- **Snapping**: Support for vertex and edge snapping with a configurable pixel radius.
- **Feature Manipulation**: Move, edit vertices, add midpoints.
- **Keyboard Shortcuts**: `Escape` (finishes drawing and switches to pan), `Enter` (finishes drawing and keeps the current tool active), and `Delete` / `Backspace` (removes the selected feature or vertex).

## 📦 Installation

```bash
npm install @zzdandanzz/deckgl-draw
```

**Peer Dependencies**
Ensure you have the required peer dependencies installed in your project:

```bash
npm install @deck.gl/core @deck.gl/layers @deck.gl/react react react-dom
```

## 🚀 Quick Start

> **💡 Looking for a complete, working example?**
> Check out the [Full Interactive Demo in the repository (`src/demo/Demo.tsx`)](./src/demo/Demo.tsx) to see it in action right away.

If you just want to get a feel for how it works, the snippet below provides a high-level overview of the main parts. Most of what you need is handled by the `EditableLayer` and the `DrawToolbar`.

Pass your GeoJSON `FeatureCollection` and manage the edit mode via standard React state. _(Note: State management and basic callbacks are omitted here for brevity to highlight the core wiring)._

```jsx
import { EditableLayer, DrawToolbar } from "@zzdandanzz/deckgl-draw";
import type { EditMode, EditableLayerEvent } from "@zzdandanzz/deckgl-draw";

export default function App() {
    // 1. Manage your state (mode, data, selections) here...

    // 2. Initialize the layer
    const editableLayer = new EditableLayer({
        id: "editable-drawing-layer",
        data,
        mode,
        selectedFeatureIds,
        onChange: handleChange,
        onSelect: (featureIds) => setSelectedFeatureIds(featureIds),
    });

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
            {/* 3. Add the Toolbar UI */}
            <DrawToolbar
                data={data}
                mode={mode}
                onChange={handleChange}
                onModeChange={setMode}
                onSelect={(featureIds) => setSelectedFeatureIds(featureIds)}
                selectedFeatureIds={selectedFeatureIds}
            />

            {/* 4. Render the Map */}
            <DeckGL
                initialViewState={{
                    longitude: -122.4,
                    latitude: 37.74,
                    zoom: 11,
                }}
                controller={true}
                layers={[editableLayer]}
            >
                <Map mapStyle={OSM_STYLE as StyleSpecification} />
            </DeckGL>
        </div>
    );
}
```

## 🗺️ Roadmap

This library has just hatched. Some edge cases have not been handled

While functional for basic use cases, there are several areas planned for future improvement:

- [ ] Add support for Multi-Geometries (`MultiPolygon`, `MultiLineString`).
- [ ] Handle complex polgyons (polygons containing inner rings)
- [ ] Implement spatial indexing (e.g., R-trees) to optimize snapping performance on datasets with thousands of vertices.
- [ ] Refactor UI styling to utilize CSS variables, making custom theming and icon replacement effortless.
