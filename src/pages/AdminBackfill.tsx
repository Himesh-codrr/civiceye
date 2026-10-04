import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanLine, Upload, CheckCircle2, AlertTriangle, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useBrand } from '@/hooks/useBrand';
import { isAdminEmail } from '@/data/admins';
import { useReports } from '@/hooks/useReports';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { uploadAnnotatedPhoto } from '@/lib/storage';
import { compressImageForAI, generateMockAnnotatedImage, generateAnnotatedFromPredictions } from '@/utils/image';
import { analyzePhotoWithRoboflow, hasRoboflowKey, roboflowConfig } from '@/services/roboflowService';
import { Badge } from '@/components/Badge';
import { PageHeader } from '@/components/PageHeader';
import { timeAgo } from '@/utils/format';

async function imageUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export function AdminBackfill() {
  const { reports, refresh } = useReports();
  const { user } = useAuth();
  const { brand } = useBrand();
  const isAdmin = isAdminEmail(user?.email, brand);
  const [processing, setProcessing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [bulkRunning, setBulkRunning] = useState(false);

  const oldReports = useMemo(() => {
    return reports.filter((r) => {
      const ai = r.ai as any;
      if (!ai) return true;                               // never AI-ran
      if (!ai.annotatedImage) return true;               // no annotation at all
      if (ai.annotatedImage === r.image) return true;    // annotated == original (no boxes)
      // Locally-drawn canvas annotations are saved as data: URLs (they start
      // with "data:image"). The correct Roboflow workflow image is uploaded
      // to Supabase storage and ends up as an https:// URL. Re-run any report
      // whose annotation is still a data: URL so it gets the clean Roboflow
      // workflow output (no double-labels / red-blob overlay).
      if (String(ai.annotatedImage).startsWith('data:')) return true;
      // Anything labelled as a non-roboflow engine also needs re-running.
      if (ai.engine && ai.engine !== 'roboflow') return true;
      return false;
    });
  }, [reports]);

  const generateForReport = async (reportId: string, _forceRedo = false) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report || !user) return;
    setProcessing(reportId);
    try {
      const rawDataUrl = await imageUrlToDataUrl(report.image);
      // Compress to Roboflow-friendly size (~768px JPEG 0.72) to avoid
      // tripping the 90s timeout with multi-MB phone photos.
      const dataUrl = await compressImageForAI(rawDataUrl);
      const ai = report.ai as any;
      const existingCategory = report.category;
      const existingConfidence = ai?.confidence || 0.85;
      const existingObjects = ai?.objects || [existingCategory];
      const existingPredictions = ai?.predictions;

      let category = existingCategory;
      let confidence = existingConfidence;
      let objects: string[] = existingObjects;
      let predictions: any[] = existingPredictions || [];
      let annotated: string | null = null;
      let engine: 'roboflow' | 'local' = 'local';
      let engineNote = '';

      // ── PRIMARY: call the real Roboflow API (Cloudflare Worker proxy) ──
      // This runs the CivicEye Pothole Reporting Starter workflow server-side
      // and returns real predictions + a workflow-annotated image. Using the
      // cloud API means backfill produces the same-quality annotations as
      // new reports, instead of re-using stale/cached local annotations.
      //
      // IMPORTANT: if Roboflow returns an `annotatedImage`, we use it AS-IS.
      // The Roboflow workflow already draws boxes, polygon fills, and per-box
      // labels — drawing our own canvas overlay on top produces the "double
      // label / red blob" mess seen in the wild (e.g. "Pothole (93%) 95%").
      if (hasRoboflowKey) {
        try {
          const rf = await analyzePhotoWithRoboflow(dataUrl, null);
          // Prefer the workflow's annotated image — never overdraw on it.
          if (rf.annotatedImage) annotated = rf.annotatedImage;
          if (rf.predictions && rf.predictions.length > 0) predictions = rf.predictions;
          category = rf.category || existingCategory;
          confidence = rf.confidence || existingConfidence;
          objects = rf.objects?.length ? rf.objects : existingObjects;
          engine = 'roboflow';
        } catch (rfErr) {
          console.warn('[backfill] Roboflow call failed, falling back to local:', rfErr);
          engineNote = `Roboflow failed (${rfErr instanceof Error ? rfErr.message : 'network'}), used local boxes.`;
        }
      } else {
        engineNote =
          'Roboflow not configured (VITE_ROBOFLOW_API_KEY missing on the server that built this bundle); used local boxes. ' +
          `proxy=${roboflowConfig.proxyUrl || '/api/roboflow'}`;
      }

      // ── FALLBACK: only draw locally when Roboflow did NOT return an
      // annotated image. If we have predictions (from Roboflow detect
      // endpoint) draw real polygon boxes; otherwise fall back to the
      // mock single-label annotation.
      if (!annotated) {
        if (predictions.length > 0 && predictions[0]?.x !== undefined) {
          try {
            annotated = await generateAnnotatedFromPredictions(dataUrl, predictions, category, confidence);
          } catch {
            annotated = await generateMockAnnotatedImage(dataUrl, category, confidence, objects);
          }
        } else {
          annotated = await generateMockAnnotatedImage(dataUrl, category, confidence, objects);
        }
      }

      // Upload to storage
      let publicUrl = annotated;
      try {
        publicUrl = await uploadAnnotatedPhoto(annotated, user.id);
      } catch (e) {
        console.warn('Upload failed, using data URL', e);
      }

      // Update in Supabase — persist the real Roboflow predictions too so
      // future re-runs can re-draw without re-calling the API.
      if (supabase) {
        const { error } = await supabase
          .from('reports')
          .update({
            ai: {
              ...(ai || {}),
              annotatedImage: publicUrl,
              originalImage: ai?.originalImage || report.image,
              engine: ai?.engine || engine,
              model: ai?.model || (engine === 'roboflow' ? 'roboflow-workflow' : 'local-backfill'),
              category,
              confidence,
              objects,
              predictions,
              summary:
                ai?.summary ||
                (engine === 'roboflow'
                  ? `Roboflow AI detected ${category} (${Math.round(confidence * 100)}% confidence) with exact outline.`
                  : `Local-fallback annotation for ${category}. ${engineNote}`),
              backfilledAt: new Date().toISOString(),
              backfillEngineNote: engineNote || null,
            }
          })
          .eq('id', reportId);
        if (error) throw error;
      }

      setResults((prev) => ({
        ...prev,
        [reportId]: engine === 'roboflow' ? 'success (roboflow)' : `success (local) — ${engineNote || 'no roboflow predictions'}`,
      }));
      await refresh();
    } catch (err) {
      console.error(err);
      setResults((prev) => ({ ...prev, [reportId]: `failed: ${err instanceof Error ? err.message : 'unknown'}` }));
    } finally {
      setProcessing(null);
    }
  };

  const bulkBackfill = async (forceRedo = false) => {
    if (bulkRunning) return;
    setBulkRunning(true);
    const list = forceRedo ? reports.slice(0, 20) : oldReports.slice(0, 20);
    for (const r of list) {
      await generateForReport(r.id, forceRedo);
      await new Promise((res) => setTimeout(res, 800));
    }
    setBulkRunning(false);
  };

  const redoAllWithExactOutline = async () => {
    if (bulkRunning) return;
    if (!confirm(`Redo ALL ${reports.length} reports with exact outline? This will regenerate all annotations with exact outline tracing, not bounding boxes.`)) return;
    setBulkRunning(true);
    for (const r of reports.slice(0, 50)) {
      await generateForReport(r.id, true);
      await new Promise((res) => setTimeout(res, 600));
    }
    setBulkRunning(false);
  };

  if (!isAdmin) {
    return (
      <div className="section-pad py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold">Staff only</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Backfill page is for admins. Sign in with admin account to regenerate AI annotations with exact outline.</p>
        <Link to="/login" className="btn-primary mt-6">Sign in as staff</Link>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-[calc(var(--nav-height)+2.5rem)]">
      <PageHeader
        eyebrow="Admin"
        title="Backfill AI Annotations"
        description="Old reports without AI exact outline can be fixed here. Calls the real Roboflow workflow API (same as new reports) to produce annotated images with boxes/outlines, uploads them to storage, and saves predictions to the database."
      />

      <div className="section-pad py-10">
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold">
                <ScanLine className="h-5 w-5 text-[#A51636]" /> {oldReports.length} reports need annotation
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                These reports have no annotated image or annotated == original. Click Generate to create exact outline.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void refresh()} className="btn-ghost">
                <RefreshCcw className="h-4 w-4" /> Refresh
              </button>
              <button 
                onClick={() => void bulkBackfill(false)} 
                disabled={bulkRunning || oldReports.length === 0}
                className="btn-secondary disabled:opacity-50"
              >
                {bulkRunning ? 'Running...' : `Bulk fix 20 oldest`}
              </button>
              <button 
                onClick={() => void redoAllWithExactOutline()} 
                disabled={bulkRunning}
                className="btn-primary disabled:opacity-50 bg-[#A51636] hover:bg-[#8a1230]"
              >
                {bulkRunning ? 'Running...' : `Redo ALL 50 with exact outline`}
              </button>
            </div>
          </div>

          {oldReports.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-3 font-bold text-emerald-800 dark:text-emerald-200">All reports have AI annotations! ✓</p>
              <p className="mt-1 text-sm text-emerald-700/70">New reports will automatically get annotated images with exact outline saved to storage.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {oldReports.slice(0, 30).map((report) => (
                <motion.div key={report.id} layout className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                  <div className="relative">
                    <img src={report.image} alt={report.title} className="aspect-[16/9] w-full object-cover" />
                    <div className="absolute left-2 top-2 flex gap-1">
                      <Badge className="bg-white/90 text-slate-700">{report.category}</Badge>
                      <Badge className="bg-amber-500/90 text-white">Needs AI</Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-[11px] text-white drop-shadow">
                      {report.id} · {timeAgo(report.date)}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-bold">{report.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{report.description}</p>
                    
                    {results[report.id] ? (
                      <div className={`mt-3 rounded-lg p-2 text-xs ${results[report.id].startsWith('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {results[report.id]}
                      </div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Original</div>
                        <img src={report.image} alt="Original" className="mt-1 h-20 w-full rounded-lg object-cover border" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">AI Annotated</div>
                        {report.ai?.annotatedImage && report.ai.annotatedImage !== report.image ? (
                          <img src={report.ai.annotatedImage} alt="Annotated" className="mt-1 h-20 w-full rounded-lg object-cover border border-emerald-300" />
                        ) : (
                          <div className="mt-1 flex h-20 w-full items-center justify-center rounded-lg border border-dashed bg-slate-50 text-[10px] text-slate-400">
                            No annotation yet
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => void generateForReport(report.id)}
                      disabled={processing === report.id || bulkRunning}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A51636] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#8a1230] disabled:opacity-50"
                    >
                      {processing === report.id ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" /> Generate AI Annotation
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-slate-900 p-5 text-white dark:bg-[#0a0a0f]">
          <h4 className="flex items-center gap-2 text-sm font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> How it works
          </h4>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-300">
            <li>Fetches original image URL → converts to data URL</li>
            <li><b>PRIMARY:</b> posts the image to the real Roboflow workflow API (via the Cloudflare Worker / <code>/api/roboflow</code> proxy) — same engine used for freshly-submitted reports. Gets back real predictions + the workflow-annotated image, which is used <b>as-is</b> (no extra boxes drawn on top).</li>
            <li><b>FALLBACK:</b> if Roboflow is unreachable/unconfigured <i>and</i> returned no annotated image, draws boxes locally with <code>generateAnnotatedFromPredictions</code> from predictions; if no predictions exist, falls back to <code>generateMockAnnotatedImage</code>. Previously backfilled reports with the red double-label / over-drawn look (data: URLs) are auto-queued for re-processing.</li>
            <li>Uploads the annotated image to Supabase Storage <code>report-photos/{`{userId}`}/annotated/</code> → public URL.</li>
            <li>Persists <code>ai.engine</code>, <code>ai.predictions</code>, <code>ai.confidence</code>, <code>ai.summary</code>, and <code>ai.backfilledAt</code> in the database — Community + Report Details then show the real boxes.</li>
            <li>Status badge shows <span className="text-emerald-300">success (roboflow)</span> when the cloud API answered, <span className="text-amber-300">success (local)</span> when the fallback was used.</li>
            <li>Rate-limited to ~1 request/sec to stay under Roboflow free-tier and Worker limits.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
