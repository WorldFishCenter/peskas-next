import { VisibilityState } from "../utils/chart-types";

interface CustomLegendProps {
  payload?: Array<any>;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  handleLegendClick: (site: string) => void;
  isCiaUser: boolean;
  isAiaUser?: boolean;
  localActiveTab: string;
}

export default function CustomLegend({
  payload,
  siteColors,
  visibilityState,
  handleLegendClick,
  isCiaUser,
  isAiaUser = false,
  localActiveTab,
}: CustomLegendProps) {
  // Filter out the auto-generated average entry from the payload
  // This prevents duplicate average entries in the legend
  const customPayload = payload?.filter((entry: any) => entry.dataKey !== "average");
  const showAverage = !isCiaUser && !isAiaUser && (localActiveTab === 'trends' || localActiveTab === 'standard');
  
  // Helper function to safely get the site key from an entry
  const getSiteKey = (entry: any): string => {
    // Try different properties in order of preference
    return entry.dataKey || entry.value || entry.name || '';
  };
  
  // Helper function to safely get opacity - make legend more readable
  const getOpacity = (entry: any): number => {
    const key = getSiteKey(entry);
    const chartOpacity = visibilityState[key]?.opacity ?? 1;
    // For legend readability, use higher minimum opacity (0.4 instead of 0.05)
    return chartOpacity === 1 ? 1 : 0.4;
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
        const chartOpacity = visibilityState[siteKey]?.opacity ?? 1;
        const legendOpacity = getOpacity(entry);
        
        return (
          <div
            key={siteKey || entry.value || Math.random().toString()}
            className="flex items-center gap-2 cursor-pointer select-none transition-all duration-200"
            onClick={() => handleLegendClick(siteKey)}
            style={{ opacity: legendOpacity }}
          >
            <div
              className="w-3 h-3 rounded-full transition-all duration-200"
              style={{
                backgroundColor: entry.color,
                opacity: chartOpacity === 1 ? 1 : 0.6, // Make color indicator more visible than text
              }}
            />
            <span 
              className={`text-sm font-medium transition-all duration-200 ${
                chartOpacity === 1 ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
} 