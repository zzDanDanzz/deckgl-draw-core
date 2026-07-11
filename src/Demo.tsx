import DeckGL from "@deck.gl/react";
import { useState } from "react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import type { FeatureCollection } from "geojson";
import type { StyleSpecification } from "maplibre-gl";

import { EditableLayer } from "./core/EditableLayer";
import type { EditableLayerEvent, EditMode, SnapOptions } from "./core/types";
import { DrawToolbar } from "./ui/DrawToolbar";

const INITIAL_VIEW_STATE = {
    longitude: -122.41669,
    latitude: 37.7853,
    zoom: 13,
    pitch: 0,
    bearing: 0,
};

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
    const [mode, setMode] = useState<EditMode>("inactive");
    const [data, setData] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: [],
    });
    const [selectedFeatureIds, setSelectedFeatureIds] = useState<
        string[] | number[]
    >([]);
    const [selectedVertexIndices, setSelectedVertexIndices] = useState<
        number[]
    >([]);
    const [snapOptions, setSnapOptions] = useState<SnapOptions>({
        enabled: true,
        snapToVertex: true,
        snapToEdge: false,
        snapRadius: 15,
    });

    const handleChange = (
        updatedData: FeatureCollection,
        event: EditableLayerEvent,
    ) => {
        console.log(`Action: ${event.type}`, event.features);
        setData(updatedData);
    };

    const handleSelect = (
        featureIds: string[] | number[],
        vertexIndices: number[],
    ) => {
        setSelectedFeatureIds(featureIds);
        setSelectedVertexIndices(vertexIndices);
    };

    const handleModeChange = (newMode: EditMode) => {
        setMode(newMode);
        setSelectedFeatureIds([]);
        setSelectedVertexIndices([]);
    };

    const editableLayer = new EditableLayer({
        id: "editable-drawing-layer",
        data: data,
        mode: mode,
        selectedFeatureIds: selectedFeatureIds,
        selectedVertexIndices: selectedVertexIndices,
        onChange: handleChange,
        onSelect: handleSelect,
        snapOptions: snapOptions,
    });

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                backgroundColor: "#1a1a1a",
            }}
        >
            {/* The new reusable UI Component */}
            <DrawToolbar
                mode={mode}
                onModeChange={handleModeChange}
                position="top-right"
                orientation="vertical"
                showSnapMenu={true}
                snapOptions={snapOptions}
                onSnapOptionsChange={setSnapOptions}
                data={data}
                selectedFeatureIds={selectedFeatureIds}
                onChange={handleChange}
                onSelect={handleSelect}
            />

            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
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
