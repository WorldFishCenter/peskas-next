"use client";

import React, { useState, useEffect } from "react";
import Map from "react-map-gl/maplibre";
import { VscSettings } from "react-icons/vsc";
import { useAtom } from 'jotai';

import {
  AmbientLight,
  PointLight,
  LightingEffect,
  Color,
  PickingInfo,
  MapViewState,
} from "@deck.gl/core";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import DeckGL from "@deck.gl/react";
import { api } from "@/trpc/react";
import cn from "@utils/class-names";
import { bmusAtom } from "@/app/components/filter-selector";

interface DataPoint {
  longitude: number;
  latitude: number;
}

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000],
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000],
});

const lightingEffect = new LightingEffect({
  ambientLight,
  pointLight1,
  pointLight2,
});

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 39.8,
  latitude: -4.3,
  zoom: 8,
  minZoom: 5,
  maxZoom: 15,
  pitch: 40.5,
};

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

const colorRange: Color[] = [
  [1, 152, 189],
  [73, 227, 206],
  [216, 254, 181],
  [254, 237, 177],
  [254, 173, 84],
  [209, 55, 78],
];

function getTooltip({ object }: PickingInfo) {
  if (!object) return null;
  const lat = object.position[1];
  const lng = object.position[0];
  const count = object.points.length;

  return {
    text: `Latitude: ${Number.isFinite(lat) ? lat.toFixed(6) : ""}
Longitude: ${Number.isFinite(lng) ? lng.toFixed(6) : ""}
N. Surveys: ${count}`,
    style: {
      color: "#fff",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: "1rem",
      borderRadius: "4px",
      marginTop: "0",
    },
  };
}

export default function DeckMap() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [radius, setRadius] = useState(1000);
  const [open, setOpen] = useState(false);
  const [bmus] = useAtom(bmusAtom);
  const { data: mapData } = api.mapDistribution.all.useQuery({ bmus });

  useEffect(() => {
    if (!mapData) return

    const points = mapData.map((d: any) => ({
      longitude: d.lon,
      latitude: d.lat,
    }));
    setData(points);
  }, [ mapData ]);

  const layers = [
    new HexagonLayer<DataPoint>({
      id: "hexagons",
      data,
      pickable: true,
      extruded: true,
      radius,
      elevationRange: [0, 3000],
      elevationScale: 30,
      coverage: 0.8,
      colorRange,
      getPosition: (d) => [d.longitude, d.latitude],
      material: {
        ambient: 0.8,
        diffuse: 0.7,
        shininess: 40,
        specularColor: [51, 51, 51],
      },
      transitions: {
        elevationScale: 3000,
      },
    }),
  ];

  return (
    <div className="w-full h-full relative">
      <DeckGL
        layers={layers}
        effects={[lightingEffect]}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        getTooltip={getTooltip}
      >
        <Map reuseMaps mapStyle={MAP_STYLE} attributionControl={false} />
      </DeckGL>
      <div
        className={cn(
          "absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg w-72 h-[calc(100%-10%)] transition-[height,width] duration-200 overflow-hidden",
          { "h-14 w-[57px] ": !open }
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div
          className={cn("flex flex-wrap justify-end flex-row", {
            "flex-row-reverse": !open,
          })}
        >
          <VscSettings
            className={cn(
              "h-[25px] w-[25px] transition-all duration-400 ease-in opacity-100",
              {
                "opacity-0 hidden": open,
              }
            )}
          />
          <h2 className="text-xl font-bold mb-2 mt-3">
            Timor-Leste Fishing Tracks
          </h2>
        </div>
        <h2 className="text-xl font-bold mb-2">Surveys Distribution</h2>
        <p className="mb-4">
          The layer aggregates survey data within the boundary of each hexagon
          cell
        </p>

        <div className="flex items-center mb-2">
          <div className="w-full bg-gradient-to-r from-[#0198BD] via-[#D8FEB5] to-[#D1374E] h-4 rounded"></div>
        </div>
        <p className="mb-4 text-sm">
          Fewer surveys <span className="float-right">More surveys</span>
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Radius (meters)
          </label>
          <input
            type="range"
            min={500}
            max={2000}
            step={500}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>500</span>
            <span>1000</span>
            <span>1500</span>
            <span>2000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
