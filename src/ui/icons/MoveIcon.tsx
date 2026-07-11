import React from "react";

export function MoveIcon({
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
            className={`icon icon-tabler icons-tabler-outline icon-tabler-arrows-move${className ? ` ${className}` : ""}`}
            {...props}
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M18 9l3 3l-3 3" />
            <path d="M15 12h6" />
            <path d="M6 9l-3 3l3 3" />
            <path d="M3 12h6" />
            <path d="M9 18l3 3l3 -3" />
            <path d="M12 15v6" />
            <path d="M15 6l-3 -3l-3 3" />
            <path d="M12 3v6" />
        </svg>
    );
}
