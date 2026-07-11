"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
    EditMode,
    SnapOptions,
    EditableLayerEvent,
    SelectedVertex,
} from "../core/types";
import { produce } from "immer";
import type { Feature, FeatureCollection } from "geojson";
import {
    HandIcon,
    LineIcon,
    MoveIcon,
    PointIcon,
    PolygonIcon,
    MagnetIcon,
    MagnetOffIcon,
    EditVerticesIcon,
    TrashIcon,
} from "./icons";
import stylesString from "./DrawToolbar.css?inline";

export type ToolbarPosition =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
export type ToolbarOrientation = "horizontal" | "vertical";

export interface DrawToolbarProps {
    mode: EditMode;
    onModeChange: (mode: EditMode) => void;
    position?: ToolbarPosition;
    orientation?: ToolbarOrientation;
    showSnapMenu?: boolean;
    snapOptions?: SnapOptions;
    onSnapOptionsChange?: (options: SnapOptions) => void;
    className?: string;
    style?: React.CSSProperties;
    data?: FeatureCollection;
    selectedFeatureIds?: string[] | number[];
    selectedVertexIndices?: SelectedVertex[];
    onChange?: (
        updatedData: FeatureCollection,
        event: EditableLayerEvent,
    ) => void;
    onSelect?: (
        selectedFeatureIds: string[] | number[],
        selectedVertexIndices: SelectedVertex[],
    ) => void;
}

export function DrawToolbar({
    mode,
    onModeChange,
    position = "top-left",
    orientation = "vertical",
    showSnapMenu = true,
    snapOptions,
    onSnapOptionsChange,
    className = "",
    style = {},
    data,
    selectedFeatureIds,
    selectedVertexIndices,
    onChange,
    onSelect,
}: DrawToolbarProps) {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    const options: SnapOptions = {
        enabled: false,
        snapToVertex: true,
        snapToEdge: true,
        snapRadius: 15,
        ...(snapOptions || {}),
    };

    const [radiusInput, setRadiusInput] = useState<string>(
        String(options.snapRadius),
    );
    const lastSnapRadiusRef = useRef(options.snapRadius);

    useEffect(() => {
        if (options.snapRadius !== lastSnapRadiusRef.current) {
            setRadiusInput(String(options.snapRadius));
            lastSnapRadiusRef.current = options.snapRadius;
        }
    }, [options.snapRadius]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                toolbarRef.current &&
                !toolbarRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const deleteSelection = useCallback(() => {
        if (
            (mode !== "select_feature" && mode !== "edit_vertices") ||
            !selectedFeatureIds ||
            selectedFeatureIds.length === 0 ||
            !data ||
            !onChange
        ) {
            return;
        }

        const selectedIds = selectedFeatureIds as (string | number)[];

        if (mode === "edit_vertices") {
            if (!selectedVertexIndices || selectedVertexIndices.length === 0) {
                return;
            }
            const selectedVertex = selectedVertexIndices[0]!;
            let featureDeleted = false;

            const updatedData = produce(data, (draft) => {
                const featureIdx = draft.features.findIndex(
                    (f) => f.id !== undefined && selectedIds.includes(f.id),
                );

                if (featureIdx !== -1) {
                    const feature = draft.features[featureIdx]!;
                    const geom = feature.geometry;

                    if (geom.type === "LineString") {
                        geom.coordinates.splice(selectedVertex.vertexIndex, 1);
                        if (geom.coordinates.length < 2) featureDeleted = true;
                    } else if (geom.type === "Polygon") {
                        const ringIndex = selectedVertex.ringIndex;
                        const ring = geom.coordinates[ringIndex]!;

                        ring.pop();
                        ring.splice(
                            selectedVertex.vertexIndex % ring.length,
                            1,
                        );

                        if (ring.length > 0) {
                            ring.push([...ring[0]!]);
                        }

                        if (ringIndex === 0) {
                            if (ring.length < 4) featureDeleted = true;
                        } else {
                            if (ring.length < 4) {
                                geom.coordinates.splice(ringIndex, 1);
                            }
                        }
                    } else if (geom.type === "Point") {
                        featureDeleted = true;
                    }

                    if (featureDeleted) {
                        draft.features.splice(featureIdx, 1);
                    }
                }
            });

            if (featureDeleted) {
                const deletedFeatures = data.features.filter(
                    (f) => f.id !== undefined && selectedIds.includes(f.id),
                );
                onChange(updatedData, {
                    type: "delete",
                    features: deletedFeatures,
                });
                if (onSelect) onSelect([], []);
            } else {
                const updatedFeatures = updatedData.features.filter(
                    (f) => f.id !== undefined && selectedIds.includes(f.id),
                );
                onChange(updatedData, {
                    type: "update",
                    features: updatedFeatures,
                });
                if (onSelect) onSelect(selectedFeatureIds, []); // Deselect the deleted vertex
            }
        } else {
            const deletedFeatures: Feature[] = [];
            const updatedData = produce(data, (draft) => {
                draft.features = draft.features.filter((feature) => {
                    if (
                        feature.id !== undefined &&
                        selectedIds.includes(feature.id)
                    ) {
                        deletedFeatures.push(feature as Feature);
                        return false;
                    }
                    return true;
                });
            });

            if (deletedFeatures.length > 0) {
                onChange(updatedData, {
                    type: "delete",
                    features: deletedFeatures,
                });
            }
            if (onSelect) onSelect([], []);
        }
    }, [
        mode,
        data,
        selectedFeatureIds,
        selectedVertexIndices,
        onChange,
        onSelect,
    ]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT")
            ) {
                return;
            }

            if (e.key === "Escape") {
                onModeChange("inactive");
            } else if (e.key === "Enter") {
                if (mode === "draw_line" || mode === "draw_polygon") {
                    const cachedMode = mode;
                    onModeChange("inactive");
                    setTimeout(() => {
                        onModeChange(cachedMode);
                    }, 0);
                }
            } else if (e.key === "Delete" || e.key === "Backspace") {
                deleteSelection();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [mode, onModeChange, deleteSelection]);

    const handleToggleEnabled = () => {
        if (onSnapOptionsChange) {
            onSnapOptionsChange({
                ...options,
                enabled: !options.enabled,
            });
        }
    };

    const handleToggleVertex = () => {
        if (onSnapOptionsChange) {
            onSnapOptionsChange({
                ...options,
                snapToVertex: !options.snapToVertex,
            });
        }
    };

    const handleToggleEdge = () => {
        if (onSnapOptionsChange) {
            onSnapOptionsChange({
                ...options,
                snapToEdge: !options.snapToEdge,
            });
        }
    };

    const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        setRadiusInput(rawValue);

        const value = parseFloat(rawValue);
        if (!isNaN(value) && value > 0 && onSnapOptionsChange) {
            onSnapOptionsChange({
                ...options,
                snapRadius: value,
            });
        }
    };

    const handleRadiusBlur = () => {
        const value = parseFloat(radiusInput);
        if (isNaN(value) || value <= 0) {
            setRadiusInput(String(options.snapRadius));
        }
    };

    const handleRadiusKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.currentTarget.blur();
        }
    };

    const getMenuPositionStyle = (): React.CSSProperties => {
        const menuStyle: React.CSSProperties = { position: "absolute" };
        const isVertical = orientation === "vertical";
        const isTop = position.includes("top");
        const isLeft = position.includes("left");

        if (isVertical) {
            if (isTop) {
                menuStyle.top = 0;
            } else {
                menuStyle.bottom = 0;
            }
            if (isLeft) {
                menuStyle.left = "100%";
                menuStyle.marginLeft = "8px";
            } else {
                menuStyle.right = "100%";
                menuStyle.marginRight = "8px";
            }
        } else {
            if (isTop) {
                menuStyle.top = "100%";
                menuStyle.marginTop = "8px";
            } else {
                menuStyle.bottom = "100%";
                menuStyle.marginBottom = "8px";
            }
            if (isLeft) {
                menuStyle.left = 0;
            } else {
                menuStyle.right = 0;
            }
        }
        return menuStyle;
    };

    const isDeleteDisabled =
        (mode !== "select_feature" && mode !== "edit_vertices") ||
        !selectedFeatureIds ||
        selectedFeatureIds.length === 0 ||
        (mode === "edit_vertices" &&
            (!selectedVertexIndices || selectedVertexIndices.length === 0));

    return (
        <div
            ref={toolbarRef}
            className={`deckgl-draw-toolbar ${isOpen ? "has-open-menu" : ""} ${className}`}
            style={style}
            data-position={position}
            data-orientation={orientation}
        >
            <style
                dangerouslySetInnerHTML={{ __html: stylesString }}
                suppressHydrationWarning
            />

            {/* Group 1: Navigation & Modification */}
            <div className="deckgl-draw-toolbar-group">
                <button
                    className="deckgl-draw-toolbar-btn"
                    title="Pan Mode"
                    data-active={mode === "inactive"}
                    onClick={() => onModeChange("inactive")}
                >
                    <HandIcon width={20} height={20} />
                </button>
                <button
                    className="deckgl-draw-toolbar-btn"
                    title="Move Feature"
                    data-active={mode === "select_feature"}
                    onClick={() => onModeChange("select_feature")}
                >
                    <MoveIcon width={20} height={20} />
                </button>
                <button
                    className="deckgl-draw-toolbar-btn"
                    title="Edit Vertices"
                    data-active={mode === "edit_vertices"}
                    onClick={() => onModeChange("edit_vertices")}
                >
                    <EditVerticesIcon width={20} height={20} />
                </button>
            </div>

            {/* Group 2: Creation */}
            <div className="deckgl-draw-toolbar-group">
                <button
                    className="deckgl-draw-toolbar-btn"
                    title="Draw Point"
                    data-active={mode === "draw_point"}
                    onClick={() => onModeChange("draw_point")}
                >
                    <PointIcon width={20} height={20} />
                </button>
                <button
                    className="deckgl-draw-toolbar-btn"
                    title="Draw Line"
                    data-active={mode === "draw_line"}
                    onClick={() => onModeChange("draw_line")}
                >
                    <LineIcon width={20} height={20} />
                </button>
                <button
                    className="deckgl-draw-toolbar-btn"
                    title="Draw Polygon"
                    data-active={mode === "draw_polygon"}
                    onClick={() => onModeChange("draw_polygon")}
                >
                    <PolygonIcon width={20} height={20} />
                </button>
            </div>

            {/* Group 3: Delete Action */}
            <div className="deckgl-draw-toolbar-group">
                <button
                    className="deckgl-draw-toolbar-btn"
                    title="Delete Selection"
                    onClick={deleteSelection}
                    disabled={isDeleteDisabled}
                    style={{
                        opacity: isDeleteDisabled ? 0.4 : 1,
                        cursor: isDeleteDisabled ? "not-allowed" : "pointer",
                    }}
                >
                    <TrashIcon
                        width={20}
                        height={20}
                        stroke={isDeleteDisabled ? "#999" : "#ff4d4f"}
                    />
                </button>
            </div>

            {/* Group 4: Settings */}
            {showSnapMenu && (
                <div className="deckgl-draw-toolbar-group deckgl-draw-toolbar-snap-container">
                    <button
                        className="deckgl-draw-toolbar-btn"
                        title={
                            options.enabled
                                ? "Snapping Settings (Enabled)"
                                : "Snapping Settings (Disabled)"
                        }
                        data-active={options.enabled}
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {options.enabled ? (
                            <MagnetIcon width={20} height={20} />
                        ) : (
                            <MagnetOffIcon width={20} height={20} />
                        )}
                    </button>
                    {isOpen && (
                        <div
                            className="deckgl-draw-snap-menu"
                            style={getMenuPositionStyle()}
                        >
                            <div className="deckgl-draw-snap-header">
                                <span>Snapping</span>
                                <label className="deckgl-draw-snap-switch">
                                    <input
                                        type="checkbox"
                                        checked={options.enabled}
                                        onChange={handleToggleEnabled}
                                    />
                                    <span className="deckgl-draw-snap-slider"></span>
                                </label>
                            </div>

                            <label
                                className={`deckgl-draw-snap-option ${!options.enabled ? "disabled" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={options.snapToVertex}
                                    onChange={handleToggleVertex}
                                    disabled={!options.enabled}
                                />
                                <span>Snap to Vertices</span>
                            </label>

                            <label
                                className={`deckgl-draw-snap-option ${!options.enabled ? "disabled" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={options.snapToEdge}
                                    onChange={handleToggleEdge}
                                    disabled={!options.enabled}
                                />
                                <span>Snap to Edges</span>
                            </label>

                            <div
                                className={`deckgl-draw-snap-radius-group ${!options.enabled ? "disabled" : ""}`}
                            >
                                <span className="deckgl-draw-snap-radius-label">
                                    Radius (px)
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="deckgl-draw-snap-radius-input"
                                    value={radiusInput}
                                    onChange={handleRadiusChange}
                                    onBlur={handleRadiusBlur}
                                    onKeyDown={handleRadiusKeyDown}
                                    disabled={!options.enabled}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
