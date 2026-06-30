'use client';

import { useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import type { SerializedIssue } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';
import CategoryIcon from '@/components/CategoryIcon';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // New Delhi fallback

/**
 * Custom canvas heatmap rendered via google.maps.OverlayView.
 * google.maps.visualization.HeatmapLayer was removed in Maps JS API v3.65, so
 * we draw radial gradients directly onto a canvas overlay instead. Each issue
 * contributes a circle whose radius and colour encode its severity:
 *   1–2 → sky blue   3 → blue   4 → orange   5 → red
 * The overlay's draw() method is called automatically on every zoom/pan.
 */
function HeatmapLayer({ issues }: { issues: SerializedIssue[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !issues.length) return;

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute',
      pointerEvents: 'none',
    });

    const mapRef = map;
    class CanvasHeatmap extends google.maps.OverlayView {
      onAdd() {
        this.getPanes()!.overlayLayer.appendChild(canvas);
      }

      draw() {
        const proj = this.getProjection();
        const bounds = mapRef.getBounds();
        if (!proj || !bounds) return;

        const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast())!;
        const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest())!;
        const left = Math.min(sw.x, ne.x);
        const top = Math.min(ne.y, sw.y);
        const w = Math.abs(ne.x - sw.x);
        const h = Math.abs(sw.y - ne.y);

        canvas.width = w;
        canvas.height = h;
        canvas.style.left = `${left}px`;
        canvas.style.top = `${top}px`;

        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, w, h);

        for (const issue of issues) {
          const pt = proj.fromLatLngToDivPixel(
            new google.maps.LatLng(issue.lat, issue.lng),
          )!;
          const x = pt.x - left;
          const y = pt.y - top;
          const r = 36 + issue.severity * 10;

          // Sarvam-on-brand ramp: sky → blue → orange → red
          const [r1, g1, b1] =
            issue.severity <= 2
              ? [56, 189, 248]
              : issue.severity === 3
                ? [59, 130, 246]
                : issue.severity === 4
                  ? [249, 115, 22]
                  : [239, 68, 68];

          const alpha = 0.22 + issue.severity * 0.09;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
          grad.addColorStop(0, `rgba(${r1},${g1},${b1},${alpha})`);
          grad.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      onRemove() {
        canvas.parentNode?.removeChild(canvas);
      }
    }

    const overlay = new CanvasHeatmap();
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, issues]);

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
