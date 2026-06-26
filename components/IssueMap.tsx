'use client';

import { useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { SerializedIssue } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // New Delhi fallback

/**
 * Lightweight "heat" overlay. Google removed visualization.HeatmapLayer from
 * the Maps JS API in v3.65, so instead of the deprecated layer we render a
 * translucent radial glow per issue (sized/intensified by severity). This needs
 * no extra library and never crashes the map.
 */
function HeatGlow({ issues }: { issues: SerializedIssue[] }) {
  return (
    <>
      {issues.map((issue) => {
        const size = 60 + issue.severity * 28;
        return (
          <AdvancedMarker
            key={`heat-${issue.id}`}
            position={{ lat: issue.lat, lng: issue.lng }}
            zIndex={1}
          >
            <div
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle, rgba(239,68,68,0.55) 0%, rgba(249,115,22,0.35) 40%, rgba(249,115,22,0) 70%)',
              }}
            />
          </AdvancedMarker>
        );
      })}
    </>
  );
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
      {issues.map((issue) => {
        const size = 18 + issue.severity * 5; // severity-proportional pin size
        return (
          <AdvancedMarker
            key={issue.id}
            position={{ lat: issue.lat, lng: issue.lng }}
            onClick={() => onSelect(issue)}
          >
            <div
              className="rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
              style={{
                width: size,
                height: size,
                backgroundColor: CATEGORY_COLORS[issue.category],
              }}
              title={issue.title}
            />
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
        {showHeatmap && <HeatGlow issues={issues} />}
        <IssuePins issues={issues} onSelect={onSelect ?? (() => {})} />
      </Map>
    </APIProvider>
  );
}
