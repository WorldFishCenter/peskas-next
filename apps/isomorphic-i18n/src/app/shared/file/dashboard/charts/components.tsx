import { TickProps } from "./types";

export function CustomYAxisTick({ x = 0, y = 0, payload = { value: 0 } }: TickProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        className="text-xs fill-gray-500"
      >
        {payload.value.toFixed(1)}
      </text>
    </g>
  );
} 