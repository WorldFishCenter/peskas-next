import { TickProps } from "./types";

export function CustomYAxisTick({ x = 0, y = 0, payload = { value: 0 } }: TickProps) {
  // Format large numbers by using toLocaleString
  const formattedValue = Number.isInteger(payload.value) && payload.value > 999
    ? payload.value.toLocaleString()
    : payload.value.toFixed(1);
    
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        className="text-xs fill-gray-500"
      >
        {formattedValue}
      </text>
    </g>
  );
} 