"use client";

import React, { useEffect, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { useAtom } from 'jotai';

import WidgetCard from '@components/cards/widget-card';
import SimpleBar from '@ui/simplebar';
import { useMedia } from '@hooks/use-media';
import { useTranslation } from '@/app/i18n/client';
import { api } from "@/trpc/react";
import { bmusAtom } from "@/app/components/filter-selector";

// Tableau10 qualitative palette
const COLORS = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
  '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'
];

interface ContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
}

const formatName = (name: string | undefined) => {
  return name ? name.replace(/_/g, ' ') : '';
};

const CustomContent = ({ 
  x = 0, 
  y = 0, 
  width = 0, 
  height = 0, 
  index = 0, 
  name = ''
}: ContentProps) => {
  const fontSize = Math.min(width / 8, height / 4, 16);
  if (width < 30 || height < 30) return null;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS[index % COLORS.length]}
        stroke="#fff"
        strokeWidth={2}
      />
      {width > 50 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={fontSize}
          fontWeight="500"
          style={{
            filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))'
          }}
        >
          {formatName(name)}
        </text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) return null;
  
  const data = payload[0].payload;
  const total = data.root?.children?.reduce((sum: number, child: any) => sum + child.size, 0) || 0;
  const percentage = total > 0 ? ((data.size / total) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
      <p className="text-sm font-medium text-gray-600 mb-2">
        {formatName(data.name)}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: COLORS[data.index % COLORS.length] }}
        />
        <p className="text-sm">
          <span className="font-medium">Count:</span>{' '}
          {data.size}
        </p>
      </div>
      <p className="text-sm">
        <span className="font-medium">Percentage:</span>{' '}
        {percentage}%
      </p>
    </div>
  );
};

export default function GearTreemap({ className, lang }: { className?: string; lang?: string; }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  
  const isTablet = useMedia('(max-width: 800px)', false);
  const { t } = useTranslation(lang!, 'common');
  const [bmus] = useAtom(bmusAtom);

  const { data: treeData } = api.gear.tree.useQuery({ bmus });

  useEffect(() => {
    if (!treeData) return

    try {
      setLoading(true);
      const transformedData = [{
        name: "Bureni",
        children: treeData.map(({gear, gear_n}: {gear: string, gear_n: number}) => ({ name: gear, size: gear_n }))
      }];

      if (transformedData.length === 0) {
        setError('No gear data available');
        return;
      }

      setData(transformedData as []);
      setError(null); 
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  }, [ treeData ]);

  if (loading) return <div>Loading chart...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data || data.length === 0) return <div>No gear data available</div>;

  return (
    <WidgetCard
      title={t('Gear Distribution')}
      // titleClassName="font-normal text-gray-700 sm:text-base font-inter"
      className={className}
    >
      <SimpleBar>
        <div className="h-96 w-full pt-9">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              aspectRatio={4/3}
              stroke="#fff"
              content={<CustomContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </SimpleBar>
    </WidgetCard>
  );
}