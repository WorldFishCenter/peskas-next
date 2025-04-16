import { VisibilityState } from "./types";

interface CustomLegendProps {
  payload?: Array<any>;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  handleLegendClick: (site: string) => void;
  isCiaUser: boolean;
  localActiveTab: string;
}

export default function CustomLegend({
  payload,
  siteColors,
  visibilityState,
  handleLegendClick,
  isCiaUser,
  localActiveTab,
}: CustomLegendProps) {
  // Filter out the auto-generated average entry from the payload
  // This prevents duplicate average entries in the legend
  const customPayload = payload?.filter((entry: any) => entry.dataKey !== "average");
  const showAverage = !isCiaUser && (localActiveTab === 'trends' || localActiveTab === 'standard');
  
  // Helper function to safely get the site key from an entry
  const getSiteKey = (entry: any): string => {
    // Try different properties in order of preference
    return entry.dataKey || entry.value || entry.name || '';
  };
  
  // Helper function to safely get opacity
  const getOpacity = (entry: any): number => {
    const key = getSiteKey(entry);
    return visibilityState[key]?.opacity ?? 1;
  };
  
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-2">
      {/* Average entry first - only show for non-CIA users and only in Trends tab */}
      {showAverage && (
        <div
          key="average"
          className="flex items-center gap-2 cursor-default select-none"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: "#000000",
            }}
          />
          <span className="text-sm font-medium">Average of all BMUs</span>
        </div>
      )}
      
      {/* Other BMUs */}
      {customPayload?.map((entry: any) => {
        const siteKey = getSiteKey(entry);
        return (
          <div
            key={siteKey || entry.value || Math.random().toString()}
            className="flex items-center gap-2 cursor-pointer select-none transition-all duration-200"
            onClick={() => handleLegendClick(siteKey)}
            style={{ opacity: getOpacity(entry) }}
          >
            <div
              className="w-3 h-3 rounded-full transition-all duration-200"
              style={{
                backgroundColor: entry.color,
              }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
} 