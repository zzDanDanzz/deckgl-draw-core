import DeckGL from "@deck.gl/react";
import { useState } from "react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// Import standard GeoJSON types
import type { FeatureCollection } from "geojson";
import type { StyleSpecification } from "maplibre-gl";

// Import your newly refactored custom layer and types
import { EditableLayer } from "./core/EditableLayer";
import type { EditableLayerEvent, EditMode } from "./core/types";

const INITIAL_VIEW_STATE = {
    longitude: -122.41669,
    latitude: 37.7853,
    zoom: 13,
    pitch: 0,
    bearing: 0,
};

// MapLibre-compatible style object for standard OSM raster tiles
const OSM_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap Contributors",
            maxzoom: 19,
        },
    },
    layers: [
        {
            id: "osm",
            type: "raster",
            source: "osm",
        },
    ],
};

export default function App() {
    // 1. State for Layer Mode
    const [mode, setMode] = useState<EditMode>("inactive");

    // 2. State for GeoJSON Data (Replaces the raw Feature[] array)
    const [data, setData] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: [],
    });

    // 3. State for Selection and Editing
    const [selectedFeatureIds, setSelectedFeatureIds] = useState<
        string[] | number[]
    >([]);
    const [selectedVertexIndices, setSelectedVertexIndices] = useState<
        number[]
    >([]);

    // 4. State for Snapping
    const [snapEnabled, setSnapEnabled] = useState<boolean>(true);

    // Callback for data changes (creates, updates, deletes)
    const handleChange = (
        updatedData: FeatureCollection,
        event: EditableLayerEvent,
    ) => {
        console.log(`Action: ${event.type}`, event.features);
        setData(updatedData);
    };

    // Callback for selections
    const handleSelect = (
        featureIds: string[] | number[],
        vertexIndices: number[],
    ) => {
        setSelectedFeatureIds(featureIds);
        setSelectedVertexIndices(vertexIndices);
    };

    // Your Refactored Custom Layer
    const editableLayer = new EditableLayer({
        id: "editable-drawing-layer",
        data: data,
        mode: mode,
        selectedFeatureIds: selectedFeatureIds,
        selectedVertexIndices: selectedVertexIndices,
        onChange: handleChange,
        onSelect: handleSelect,
        // Pass the snap options linked to our new state
        snapOptions: {
            enabled: snapEnabled,
            snapToVertex: true, // You can also expose these as UI toggles later if needed
            snapToEdge: false,
            snapRadius: 15,
        },
    });

    return (
        <div
            style={{
                position: "relative",
                width: "100vw",
                height: "100vh",
                backgroundColor: "#1a1a1a",
            }}
        >
            {/* Basic UI Controls */}
            <div
                style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    zIndex: 1,
                    background: "#fff",
                    padding: "15px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    fontFamily: "sans-serif",
                    maxWidth: "400px",
                }}
            >
                <h3 style={{ marginTop: 0 }}>EditableLayer v2 Test</h3>

                <div style={{ marginBottom: "10px" }}>
                    <strong>Map Controls</strong>
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "5px",
                        }}
                    >
                        <button
                            onClick={() => setMode("inactive")}
                            style={{
                                fontWeight:
                                    mode === "inactive" ? "bold" : "normal",
                            }}
                        >
                            Pan Map (Inactive)
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                    <strong>Draw Modes</strong>
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "5px",
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            onClick={() => setMode("draw_point")}
                            style={{
                                fontWeight:
                                    mode === "draw_point" ? "bold" : "normal",
                            }}
                        >
                            Draw Point
                        </button>
                        <button
                            onClick={() => setMode("draw_line")}
                            style={{
                                fontWeight:
                                    mode === "draw_line" ? "bold" : "normal",
                            }}
                        >
                            Draw Line
                        </button>
                        <button
                            onClick={() => setMode("draw_polygon")}
                            style={{
                                fontWeight:
                                    mode === "draw_polygon" ? "bold" : "normal",
                            }}
                        >
                            Draw Polygon
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                    <strong>Edit Modes</strong>
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "5px",
                        }}
                    >
                        <button
                            onClick={() => setMode("select_feature")}
                            style={{
                                fontWeight:
                                    mode === "select_feature"
                                        ? "bold"
                                        : "normal",
                            }}
                        >
                            Select / Move
                        </button>
                        <button
                            onClick={() => setMode("edit_vertices")}
                            style={{
                                fontWeight:
                                    mode === "edit_vertices"
                                        ? "bold"
                                        : "normal",
                            }}
                        >
                            Edit Vertices
                        </button>
                    </div>
                </div>

                {/* --- NEW SNAPPING CONTROLS --- */}
                <div style={{ marginBottom: "15px" }}>
                    <strong>Snapping Options</strong>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "5px",
                        }}
                    >
                        <input
                            type="checkbox"
                            id="snapToggle"
                            checked={snapEnabled}
                            onChange={(e) => setSnapEnabled(e.target.checked)}
                            style={{ cursor: "pointer" }}
                        />
                        <label
                            htmlFor="snapToggle"
                            style={{ fontSize: "14px", cursor: "pointer" }}
                        >
                            Enable Snapping
                        </label>
                    </div>
                </div>

                <div>
                    <strong>Features Captured:</strong> {data.features.length}
                </div>
                <p
                    style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "10px",
                    }}
                >
                    <em>
                        Note: Switch modes to trigger layer finalization. Use
                        Selection modes to test drag-and-drop translations.
                    </em>
                </p>
            </div>

            {/* DeckGL Canvas */}
            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
                // Only disable controller if in select or edit vertices mode.
                controller={
                    mode !== "select_feature" && mode !== "edit_vertices"
                }
                layers={[editableLayer]}
                getCursor={({ isDragging }) =>
                    isDragging
                        ? "grabbing"
                        : mode !== "inactive"
                          ? "crosshair"
                          : "grab"
                }
                eventRecognizerOptions={{
                    click: {
                        interval: 0,
                        threshold: 15,
                        time: 500,
                    },
                }}
            >
                <Map mapStyle={OSM_STYLE as StyleSpecification} />
            </DeckGL>
        </div>
    );
}
