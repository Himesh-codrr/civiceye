import { useState, useRef, useCallback } from 'react';
import { CheckCircle2, ScanLine, Sparkles } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  className?: string;
}

export function BeforeAfterSlider({ 
  beforeImage, 
  afterImage, 
  beforeLabel = 'Before — Issue Reported',
  afterLabel = 'After — Fixed & Verified',
  aiVerified = false,
  aiConfidence,
  className = ''
}: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    handleMove(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onPointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-[16px] border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900 ${className}`}>
      <div 
        ref={containerRef}
        className="relative aspect-[16/10] w-full select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setIsDragging(false)}
      >
        {/* After image - full */}
        <img src={afterImage} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute bottom-3 right-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow">
          {afterLabel}
        </div>

        {/* Before image - clipped */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <img src={beforeImage} alt={beforeLabel} className="h-full w-full object-cover" />
          <div className="absolute bottom-3 left-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {beforeLabel}
          </div>
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)]"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#A51636] text-white shadow-lg">
            <span className="text-xs font-black">◀▶</span>
          </div>
        </div>

        {/* AI verified badge */}
        {aiVerified ? (
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            <CheckCircle2 className="h-3.5 w-3.5" /> AI Verified Fix {aiConfidence ? `${Math.round(aiConfidence*100)}%` : ''} <Sparkles className="h-3 w-3" />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between bg-white p-3 text-xs dark:bg-black/20">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <ScanLine className="h-3.5 w-3.5" /> Drag slider to compare proof of fix
        </div>
        <div className="text-[11px] font-medium text-slate-500">
          Before → After
        </div>
      </div>
    </div>
  );
}

interface ProofOfFixUploaderProps {
  beforeImage: string;
  onUploadAfter: (afterImage: string) => void;
  onVerify?: () => void;
}

export function ProofOfFixUploader({ beforeImage, onUploadAfter, onVerify }: ProofOfFixUploaderProps) {
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAfterImage(dataUrl);
      onUploadAfter(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">Before</div>
          <img src={beforeImage} alt="Before" className="h-32 w-full rounded-xl object-cover border" />
        </div>
        <div>
          <div className="mb-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600">After — Upload Fix Proof</div>
          {afterImage ? (
            <img src={afterImage} alt="After" className="h-32 w-full rounded-xl object-cover border border-emerald-300" />
          ) : (
            <label 
              className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 transition-colors hover:bg-slate-100 dark:bg-white/5 ${dragOver ? 'border-[#A51636] bg-[#A51636]/5' : 'border-slate-300'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <span className="text-xs font-bold text-slate-600">Drop after photo or click</span>
              <span className="mt-1 text-[11px] text-slate-400">Fix proof will be AI verified</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          )}
        </div>
      </div>
      {afterImage ? (
        <div className="flex gap-2">
          <button onClick={() => { setAfterImage(null); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Remove</button>
          <button onClick={() => onVerify?.()} className="rounded-xl bg-[#A51636] px-4 py-2 text-xs font-bold text-white">Verify Fix with AI ✨</button>
        </div>
      ) : null}
      {afterImage ? (
        <BeforeAfterSlider beforeImage={beforeImage} afterImage={afterImage} />
      ) : null}
    </div>
  );
}
