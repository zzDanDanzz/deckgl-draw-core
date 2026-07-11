import React from "react";

export function PointIcon({
    width = 24,
    height = 24,
    stroke = "currentColor",
    strokeWidth = 2,
    fill = "none",
    className,
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`icon icon-tabler icons-tabler-outline icon-tabler-point${className ? ` ${className}` : ""}`}
            {...props}
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
        </svg>
    );
}
