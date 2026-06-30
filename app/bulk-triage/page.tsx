'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { CATEGORY_LABELS, type IssueAnalysis, type IssueCategory } from '@/lib/types';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Building,
  Tag,
  X,
  Sparkles,
  ClipboardList,
  RotateCw,
} from '@/components/icons';
import { compressImageToDataUrl } from '@/lib/image';

/**
 * Site Visit Bulk Triage — upload up to 10 photos from a field inspection,
 * run them all through the Gemini analysis pipeline in parallel, deduplicate
 * same-category hits, and produce a consolidated triage report ready to file.
 *
 * This replaces the single-photo bottleneck for field inspectors who visit
 * a neighbourhood and photograph every problem they find in one pass.
 */

interface TriagePhoto {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'analysing' | 'done' | 'error';
  analysis?: IssueAnalysis;
  error?: string;
}

const MAX_PHOTOS = 10;

function SeverityDots({ severity }: { severity: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < severity ? 'bg-red-500' : 'bg-ink/15'}`}
        />
      ))}
    </span>
  );
}

export default function BulkTriagePage() {
  const [photos, setPhotos] = useState<TriagePhoto[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  let idCounter = useRef(0);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const toAdd = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const newPhotos: TriagePhoto[] = toAdd.map((file) => ({
      id: String(++idCounter.current),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    setDone(false);
  }, [photos.length]);

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setDone(false);
  }

  async function runTriage() {
    if (photos.length === 0 || running) return;
    setRunning(true);
    setDone(false);

    // Mark all pending photos as analysing.
    setPhotos((prev) => prev.map((p) => ({ ...p, status: 'analysing' as const })));

    // Run all analyses in parallel — this is the core value prop vs single-photo.
    const results = await Promise.allSettled(
      photos.map(async (photo) => {
        const compressed = await compressImageToDataUrl(photo.file);
        const fd = new FormData();
        fd.append('image', dataUrlToFile(compressed, photo.file.name));
        const res = await fetch('/api/analyze', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.analysis) throw new Error('No analysis returned');
        return { id: photo.id, analysis: data.analysis as IssueAnalysis };
      }),
    );

    setPhotos((prev) =>
      prev.map((photo, i) => {
        const result = results[i];
        if (result.status === 'fulfilled') {
          return { ...photo, status: 'done', analysis: result.value.analysis };
        } else {
          return {
            ...photo,
            status: 'error',
            error: result.reason instanceof Error ? result.reason.message : 'Failed',
          };
        }
      }),
    );

    setRunning(false);
    setDone(true);
  }

  function reset() {
    setPhotos([]);
    setDone(false);
  }

  // Build the consolidated triage report — deduplicate same-category issues.
  const validPhotos = photos.filter((p) => p.status === 'done' && p.analysis?.isValid);
  const groupedByCategory = validPhotos.reduce<Record<IssueCategory, TriagePhoto[]>>(
    (acc, p) => {
      const cat = p.analysis!.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    },
    {} as Record<IssueCategory, TriagePhoto[]>,
  );

  // The "representative" for each category is the highest-severity photo.
  const uniqueIssues = Object.entries(groupedByCategory).map(([cat, group]) => {
    const rep = group.reduce((a, b) =>
      (b.analysis!.severity ?? 0) > (a.analysis!.severity ?? 0) ? b : a,
    );
    return { category: cat as IssueCategory, rep, duplicateCount: group.length - 1 };
  });

  const safetyCount = validPhotos.filter((p) => p.analysis?.safetyRisk).length;
  const errorCount = photos.filter((p) => p.status === 'error').length;
  const pendingCount = photos.filter((p) => p.status === 'pending').length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sarvam-sky/40 px-3 py-1 text-xs font-semibold text-sarvam-blue">
          <Sparkles className="h-3.5 w-3.5" /> Parallel AI Triage
        </span>
        <h1 className="mt-3 font-serif text-3xl font-medium text-ink">
          Site Visit Bulk Triage
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink/55">
          Upload up to {MAX_PHOTOS} photos from a field inspection. The Gemini agent
          triages them all simultaneously, deduplicates same-category issues, and
          produces a consolidated action report.
        </p>
      </div>

      {/* Upload zone */}
      {photos.length < MAX_PHOTOS && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={running}
          className="glass-card-hover mb-6 flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-ink/20 py-10 transition disabled:opacity-60"
        >
          <Camera className="h-8 w-8 text-sarvam-blue" />
          <span className="text-sm font-medium text-ink/70">
            {photos.length === 0
              ? 'Tap to select photos (up to 10)'
              : `Add more photos (${photos.length}/${MAX_PHOTOS})`}
          </span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              {/* Status overlay */}
              {photo.status === 'analysing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </div>
              )}
              {photo.status === 'done' && photo.analysis?.isValid && (
                <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 px-1.5 py-1 text-center text-[10px] font-semibold text-white">
                  {CATEGORY_LABELS[photo.analysis.category]}
                </div>
              )}
              {(photo.status === 'error' || (photo.status === 'done' && !photo.analysis?.isValid)) && (
                <div className="absolute bottom-0 inset-x-0 bg-ink/70 px-1.5 py-1 text-center text-[10px] text-white/80">
                  {photo.status === 'error' ? 'Error' : 'Not valid'}
                </div>
              )}
              {!running && (
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-white"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CTA buttons */}
      {photos.length > 0 && (
        <div className="mb-8 flex gap-3">
          {!done && (
            <button
              onClick={runTriage}
              disabled={running || pendingCount === 0 && !done}
              className="btn-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm disabled:opacity-60"
            >
              {running ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Analysing {photos.length} photo{photos.length !== 1 ? 's' : ''}…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run Triage ({photos.length} photo{photos.length !== 1 ? 's' : ''})
                </>
              )}
            </button>
          )}
          {done && (
            <button
              onClick={reset}
              className="btn-ghost flex items-center gap-2 px-5 py-3 text-sm"
            >
              <RotateCw className="h-4 w-4" /> New triage
            </button>
          )}
        </div>
      )}

      {/* Triage report */}
      {done && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="glass-card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
              <ClipboardList className="h-5 w-5 text-sarvam-blue" />
              Triage Report — {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-sarvam-sky/20 p-3">
                <p className="text-2xl font-bold text-sarvam-blue">{uniqueIssues.length}</p>
                <p className="mt-0.5 text-xs text-ink/60">Unique issues</p>
              </div>
              <div className={`rounded-2xl p-3 ${safetyCount > 0 ? 'bg-red-100' : 'bg-emerald-50'}`}>
                <p className={`text-2xl font-bold ${safetyCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {safetyCount}
                </p>
                <p className="mt-0.5 text-xs text-ink/60">Safety risks</p>
              </div>
              <div className="rounded-2xl bg-ink/5 p-3">
                <p className="text-2xl font-bold text-ink">
                  {validPhotos.length - uniqueIssues.length}
                </p>
                <p className="mt-0.5 text-xs text-ink/60">Duplicates removed</p>
              </div>
            </div>
            {errorCount > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {errorCount} photo{errorCount !== 1 ? 's' : ''} could not be analysed.
              </p>
            )}
          </div>

          {/* Unique issues list */}
          {uniqueIssues.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-ink/55">
              No reportable civic issues detected in the uploaded photos.
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-ink">Issues to File</h3>
              {uniqueIssues
                .sort((a, b) => (b.rep.analysis?.severity ?? 0) - (a.rep.analysis?.severity ?? 0))
                .map(({ category, rep, duplicateCount }) => {
                  const a = rep.analysis!;
                  return (
                    <div key={category} className="glass-card p-4">
                      <div className="flex items-start gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rep.previewUrl}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink">
                              <Tag className="h-3 w-3" />
                              {CATEGORY_LABELS[category]}
                            </span>
                            {a.safetyRisk && (
                              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                <AlertTriangle className="h-3 w-3" /> Safety risk
                              </span>
                            )}
                            {duplicateCount > 0 && (
                              <span className="rounded-full bg-sarvam-sky/30 px-2 py-0.5 text-xs text-sarvam-blue">
                                +{duplicateCount} similar
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-ink line-clamp-1">
                            {a.suggestedTitle}
                          </p>
                          <div className="mt-1.5 flex items-center gap-3">
                            <SeverityDots severity={a.severity} />
                            <span className="flex items-center gap-1 text-xs text-ink/55">
                              <Building className="h-3 w-3" /> {a.routeTo}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs text-ink/55">
                            {a.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* File issues CTA */}
              <div className="glass-card flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Ready to file {uniqueIssues.length} issue{uniqueIssues.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-ink/55">
                    Use the Report page to submit each one with your GPS location.
                  </p>
                </div>
                <Link href="/report" className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">
                  <CheckCircle className="h-4 w-4" /> File Issues
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Convert a data URL back to a File for FormData submission. */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
