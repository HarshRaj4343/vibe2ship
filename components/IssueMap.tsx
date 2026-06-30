'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { SerializedIssue } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';
import CategoryIcon from '@/components/CategoryIcon';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // New Delhi fallback

/**
 * Real Google Maps Platform heat layer. We pull the `visualization` library on
 * demand (`useMapsLibrary`) and drive a native `google.maps.visualization.
 * HeatmapLayer`, weighting each point by issue severity so genuine hotspots
 * (clusters of high-severity reports) burn brightest. The layer attaches to the
 * live map instance via `useMap()` and is torn down on unmount/toggle-off.
 */
// The bundled @types/google.maps ships only a partial HeatmapLayer type (no
// options constructor, no setData). Model the runtime surface we actually use.
interface RuntimeHeatmapLayer {
  setData(data: Array<{ location: google.maps.LatLng; weight: number }>): void;
  setMap(map: google.maps.Map | null): void;
}

function HeatmapLayer({ issues }: { issues: SerializedIssue[] }) {
  const map = useMap();
  const visualization = useMapsLibrary('visualization');
  const layerRef = useRef<RuntimeHeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !visualization) return;

    // The runtime accepts the HeatmapLayerOptions object even though the
    // bundled type doesn't declare it — construct through a precise cast.
    const HeatmapLayerCtor = visualization.HeatmapLayer as unknown as new (
      opts: Record<string, unknown>,
    ) => RuntimeHeatmapLayer;

    const layer =
      layerRef.current ??
      new HeatmapLayerCtor({
        radius: 38,
        opacity: 0.75,
        // Sarvam-on-brand ramp: transparent → sky → blue → orange → red.
        gradient: [
          'rgba(56, 189, 248, 0)',
          'rgba(56, 189, 248, 0.5)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(249, 115, 22, 0.85)',
          'rgba(239, 68, 68, 1)',
        ],
      });
    layerRef.current = layer;

    layer.setData(
      issues.map((i) => ({
        location: new google.maps.LatLng(i.lat, i.lng),
        weight: i.severity, // 1–5 → hotter where severe issues cluster
      })),
    );
    layer.setMap(map);

    return () => layer.setMap(null);
  }, [map, visualization, issues]);

  return null;
}

function IssuePins({
  issues,
  onSelect,
}: {
  issues: SerializedIssue[];
  onSelect: (issue: SerializedIssue) => void;
}) {
  return (
    <>
      {issues.map((issue, i) => {
        const size = 26 + issue.severity * 4; // severity-proportional pin size
        return (
          <AdvancedMarker
            key={issue.id}
            position={{ lat: issue.lat, lng: issue.lng }}
            onClick={() => onSelect(issue)}
          >
            <div
              className="animate-pin-drop flex items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-transform hover:scale-110"
              style={{
                width: size,
                height: size,
                backgroundColor: CATEGORY_COLORS[issue.category],
                // Stagger the drop so a cluster cascades in rather than popping
                // all at once. Capped so a busy map still finishes quickly.
                animationDelay: `${Math.min(i * 45, 600)}ms`,
              }}
              title={issue.title}
            >
              <CategoryIcon
                category={issue.category}
                style={{ width: size * 0.55, height: size * 0.55 }}
              />
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export default function IssueMap({
  issues,
  selectedId,
  onSelect,
  showHeatmap,
}: {
  issues: SerializedIssue[];
  selectedId?: string;
  onSelect?: (issue: SerializedIssue) => void;
  showHeatmap?: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const center = useMemo(() => {
    if (selectedId) {
      const sel = issues.find((i) => i.id === selectedId);
      if (sel) return { lat: sel.lat, lng: sel.lng };
    }
    if (issues.length > 0) return { lat: issues[0].lat, lng: issues[0].lng };
    return DEFAULT_CENTER;
  }, [issues, selectedId]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-center text-sm text-slate-500">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        mapId="urbanpulse-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="h-full w-full"
      >
        {showHeatmap && <HeatmapLayer issues={issues} />}
        <IssuePins issues={issues} onSelect={onSelect ?? (() => {})} />
      </Map>
    </APIProvider>
  );
}
