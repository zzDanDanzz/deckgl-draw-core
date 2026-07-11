import { useState } from "react";
import type { FeatureCollection } from "geojson";

export interface GeoJSONInspectorProps {
    data: FeatureCollection;
    defaultOpen?: boolean;
}

export function GeoJSONInspector({
    data,
    defaultOpen = false,
}: GeoJSONInspectorProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div
            style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                width: 350,
                maxHeight: "50vh",
                backgroundColor: "#fff",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                zIndex: 20,
                overflow: "hidden",
                fontFamily: "monospace",
            }}
        >
            <div
                style={{
                    padding: "12px 16px",
                    backgroundColor: "#f8f9fa",
                    borderBottom: isOpen ? "1px solid #e9ecef" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "#333",
                    fontSize: "14px",
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>GeoJSON Inspector</span>
                <span style={{ fontSize: "10px" }}>
                    {isOpen ? "▼" : "▲"}
                </span>
            </div>
            {isOpen && (
                <div
                    style={{
                        padding: "16px",
                        overflowY: "auto",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        color: "#212529",
                        backgroundColor: "#ffffff",
                    }}
                >
                    {JSON.stringify(data, null, 2)}
                </div>
            )}
        </div>
    );
}
