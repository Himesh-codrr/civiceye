import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bug,
  Camera,
  ChefHat,
  CircleHelp,
  Clock,
  Download,
  Droplets,
  ExternalLink,
  ImagePlus,
  Leaf,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { anonymizeImage, ANON_IMAGE_LIMITS, type AnonImage } from '@/utils/anonymizeImage';

/**
 * Food Hygiene Complaints — 100% anonymous, lightning-quick form.
 *
 * - No login required (mounts outside the RequireAuth gate in App.tsx).
 * - No identifying fields (no name / email / roll-no / phone / user id).
 * - POSTs only the content fields to /api/food-hygiene, which mails
 *   directly to the Amrita mess/canteen helplines and deliberately
 *   strips IP / UA / referrer etc. from the outgoing email.
 * - Tiny form: location chip + issue chip + severity + optional when +
 *   one short description. Submit in ≤10 seconds.
 */

const LOCATIONS = [
  { id: 'boys-hostel-mess', label: 'Boys Hostel Mess', icon: UtensilsCrossed },
  { id: 'girls-hostel-mess', label: 'Girls Hostel Mess', icon: UtensilsCrossed },
  { id: 'central-canteen', label: 'Central Canteen', icon: ChefHat },
  { id: 'night-canteen', label: 'Night Canteen', icon: ChefHat },
  { id: 'food-court', label: 'Food Court / Other', icon: UtensilsCrossed },
  { id: 'water-dispenser', label: 'Drinking Water', icon: Droplets },
  { id: 'unknown', label: 'Not sure', icon: CircleHelp },
] as const;

const ISSUES = [
  { id: 'foreign-object', label: 'Foreign object (hair / insect / stone)', icon: Bug },
  { id: 'undercooked', label: 'Undercooked / raw food', icon: ChefHat },
  { id: 'spoilage', label: 'Spoiled / bad smell / taste', icon: AlertTriangle },
  { id: 'hygiene', label: 'Unclean serving area / utensils', icon: Sparkles },
  { id: 'allergen', label: 'Allergen / veg-nonveg mix-up', icon: Leaf },
  { id: 'water', label: 'Unsafe drinking water', icon: Droplets },
  { id: 'other', label: 'Other', icon: CircleHelp },
] as const;

const SEVERITIES = [
  { id: 'low',      label: 'Minor',           color: 'bg-[#91dcc4]' },
  { id: 'medium',   label: 'Same day',        color: 'bg-[#ffd630]' },
  { id: 'high',     label: 'Urgent',          color: 'bg-[#ffa94d]' },
  { id: 'critical', label: 'Health risk',     color: 'bg-[#ef6b59] text-white' },
] as const;

type Phase = 'idle' | 'sending' | 'done' | 'error';

export function FoodHygienePage() {
  const [location, setLocation] = useState<string>('');
  const [issueType, setIssueType] = useState<string>('');
  const [severity, setSeverity] = useState<string>('medium');
  const [whenHappened, setWhenHappened] = useState<string>('');
  const [dietary, setDietary] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [images, setImages] = useState<AnonImage[]>([]);
  const [imageProcessing, setImageProcessing] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [ref, setRef] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [mailto, setMailto] = useState<string>('');
  const [grievanceMailto, setGrievanceMailto] = useState<string>('');
  const [grievancePortal, setGrievancePortal] = useState<string>('');
  const toast = useToast();

  const canSubmit = issueType.length > 0 && description.trim().length >= 3 && phase !== 'sending' && !imageProcessing;

  const reset = () => {
    setLocation(''); setIssueType(''); setSeverity('medium');
    setWhenHappened(''); setDietary(''); setDescription('');
    setImages([]); setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPhase('idle'); setRef(''); setError(''); setMailto('');
    setGrievanceMailto(''); setGrievancePortal('');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImageError('');
    const remaining = ANON_IMAGE_LIMITS.maxFiles - images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      setImageError(`You can attach at most ${ANON_IMAGE_LIMITS.maxFiles} photos — extra ones were skipped.`);
    }
    setImageProcessing(true);
    const added: AnonImage[] = [];
    for (const f of toProcess) {
      try {
        const img = await anonymizeImage(f);
        added.push(img);
      } catch (e: any) {
        setImageError(e?.message || 'Could not read one of the images.');
      }
    }
    setImages((prev) => [...prev, ...added]);
    setImageProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Save a scrubbed photo to the user's device. The data URL is already
  // an EXIF-free JPEG produced by anonymizeImage() — what the user
  // saves here is exactly what was/will be attached to the anonymous
  // email, so they can attach it to a personal grievance ticket too.
  const downloadPhoto = (img: AnonImage, idx: number) => {
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = `food-hygiene-${ref || 'evidence'}-${idx + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const downloadAllPhotos = () => {
    images.forEach((img, i) => {
      // Small stagger so mobile browsers don't drop multiple downloads.
      window.setTimeout(() => downloadPhoto(img, i), i * 180);
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setPhase('sending'); setError(''); setMailto('');
    try {
      const res = await fetch('/api/food-hygiene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Intentionally NO credentials / Authorization — this is anonymous.
        credentials: 'omit',
        body: JSON.stringify({
          location, issueType, severity, whenHappened, dietary, description,
          images: images.map((i) => i.dataUrl),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setRef(data.ref);
        setGrievanceMailto(data.grievance?.mailto || '');
        setGrievancePortal(data.grievance?.portalUrl || '');
        setPhase('done');
        toast.success('Sent anonymously', `Your report is on its way to the mess/canteen helpline and campus info. Ref ${data.ref}`);
        return;
      }
      if (res.status === 503 && data.reason === 'EMAIL_NOT_CONFIGURED' && data.mailto) {
        // Fall back to user's mail app — pre-filled, still no identity
        // baked into the body.
        setMailto(data.mailto);
        setRef(data.ref);
        setPhase('done');
        toast.success('Opening your mail app…', 'Tap Send in your mail app — the message has no name or account attached.');
        // Small delay so the toast paints before mailto: hijacks the tab.
        window.setTimeout(() => { window.location.href = data.mailto; }, 600);
        return;
      }
      if (res.status === 429) {
        setError('Too many submissions from this network. Wait a bit and try again.');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
      setPhase('error');
    } catch {
      setError('Network error. Check your connection and try again.');
      setPhase('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8e7] px-3 pb-24 pt-24 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-5 border-[4px] border-[#172b44] bg-[#fffdf4] p-5 shadow-[8px_8px_0_#A51636] sm:p-7"
        >
          <span className="absolute -right-3 -top-3 rotate-6 border-[3px] border-[#172b44] bg-[#ef6b59] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-[2px_2px_0_#172b44]">
            100% Anonymous
          </span>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-[#172b44] bg-[#ffd630] shadow-[3px_3px_0_#172b44]">
              <UtensilsCrossed className="h-7 w-7 text-[#172b44]" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl font-black uppercase leading-tight text-[#172b44] sm:text-3xl">
                Food Hygiene Complaints
              </h1>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-[#172b44]/80">
                Saw something off in the mess or canteen? Send it straight to
                the campus food-safety helplines. No login, no name, no roll
                number, no email — this box doesn't know who you are.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-black uppercase tracking-wider text-[#172b44]">
                <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> No account needed</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> No IP / device tracked</span>
                <span className="inline-flex items-center gap-1"><Send className="h-3 w-3" /> Goes direct to wardens</span>
              </div>
            </div>
          </div>
        </motion.div>

        {phase === 'done' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-[4px] border-[#172b44] bg-[#fffdf4] p-6 shadow-[8px_8px_0_#91dcc4]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center border-[3px] border-[#172b44] bg-[#91dcc4] shadow-[3px_3px_0_#172b44]">
                <CheckCircle2 className="h-6 w-6 text-[#172b44]" strokeWidth={3} />
              </div>
              <div>
                <p className="font-serif text-xl font-black uppercase text-[#172b44]">Sent. Thank you.</p>
                <p className="text-sm font-bold text-[#172b44]/80">
                  Reference: <span className="font-mono">{ref}</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-snug text-[#172b44]/85">
              Your anonymous report has been emailed to the campus info desk
              (<span className="font-mono">info@blr.amrita.edu</span>), the
              Chief Warden, Hostel Office, DSW / Student Welfare, Mess
              Complaints and Estate. The CivicEye team is BCC'd so nothing
              falls through the cracks. Please give staff time to investigate.
            </p>

            {/* Optional: file a non-anonymous ticket on the official
                Amrita grievance portal as well, with the same details
                pre-filled so the student gets a ticket number they can
                track. Clicking this is entirely optional. */}
            {(grievancePortal || grievanceMailto) && (
              <div className="mt-5 border-[3px] border-dashed border-[#172b44] bg-[#fff8e7] p-3 shadow-[3px_3px_0_#172b44]">
                <p className="text-[11px] font-black uppercase tracking-wider text-[#172b44]">
                  File on Amrita grievance portal (optional)
                </p>
                <p className="mt-1 text-[11px] font-bold leading-snug text-[#172b44]/75">
                  Tap to open the official Amrita contact / grievance page
                  or a pre-filled email to info@blr.amrita.edu — useful if
                  you want a personal ticket number. <em>This one is NOT
                  anonymous</em> (it uses your mail app).
                </p>

                {images.length > 0 && (
                  <>
                    <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-[#172b44]">
                      📸 Save your photo evidence first
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-snug text-[#172b44]/75">
                      Browsers can't attach files automatically to a
                      mailto link, so tap <strong>Save</strong> on each
                      photo below (they're already stripped of GPS/EXIF)
                      and attach them to the grievance email or upload
                      form after you click the button. The same photos
                      are already attached to the anonymous email.
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {images.map((img, i) => (
                        <div
                          key={i}
                          className="relative aspect-square overflow-hidden border-[3px] border-[#172b44] bg-black shadow-[3px_3px_0_#172b44]"
                        >
                          <img src={img.dataUrl} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => downloadPhoto(img, i)}
                            className="absolute bottom-1 right-1 flex items-center gap-1 border-[2px] border-[#172b44] bg-[#ffd630] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#172b44] shadow-[2px_2px_0_#172b44] transition hover:bg-[#91dcc4]"
                          >
                            <Download className="h-3 w-3" strokeWidth={3} /> Save
                          </button>
                          <span className="absolute bottom-1 left-1 border-[2px] border-[#172b44] bg-[#fffdf4] px-1 py-0.5 text-[9px] font-black uppercase text-[#172b44]">
                            {i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={downloadAllPhotos}
                      className="mt-2 inline-flex items-center gap-1.5 border-[3px] border-[#172b44] bg-[#fffdf4] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#172b44] shadow-[2px_2px_0_#172b44] transition hover:-translate-y-0.5 hover:bg-[#91dcc4]"
                    >
                      <Download className="h-3 w-3" strokeWidth={3} /> Save all photos ({images.length})
                    </button>
                  </>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {grievancePortal && (
                    <a
                      href={grievancePortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 border-[3px] border-[#172b44] bg-[#ffd630] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:-translate-y-0.5 hover:bg-[#91dcc4]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open grievance portal
                    </a>
                  )}
                  {grievanceMailto && (
                    <a
                      href={grievanceMailto}
                      className="inline-flex items-center gap-1.5 border-[3px] border-[#172b44] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:-translate-y-0.5 hover:bg-[#91dcc4]"
                    >
                      <Mail className="h-3.5 w-3.5" /> Pre-filled email to info@blr.amrita.edu
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={reset}
                className="border-[3px] border-[#172b44] bg-[#ffd630] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:-translate-y-0.5 hover:bg-[#91dcc4]"
              >
                Submit another
              </button>
              {mailto && (
                <a
                  href={mailto}
                  className="border-[3px] border-[#172b44] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:bg-[#91dcc4]"
                >
                  Re-open mail app
                </a>
              )}
            </div>
          </motion.div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Where */}
            <Section title="1 · Where was it?" icon={MapPin}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LOCATIONS.map((L) => (
                  <Chip
                    key={L.id}
                    active={location === L.id}
                    onClick={() => setLocation(L.id)}
                  >
                    <L.icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <span className="truncate">{L.label}</span>
                  </Chip>
                ))}
              </div>
            </Section>

            {/* What */}
            <Section title="2 · What happened?" icon={AlertTriangle}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ISSUES.map((I) => (
                  <Chip
                    key={I.id}
                    active={issueType === I.id}
                    onClick={() => setIssueType(I.id)}
                  >
                    <I.icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <span className="text-left">{I.label}</span>
                  </Chip>
                ))}
              </div>
            </Section>

            {/* How bad */}
            <Section title="3 · How bad?" icon={ShieldCheck}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SEVERITIES.map((S) => (
                  <button
                    type="button"
                    key={S.id}
                    onClick={() => setSeverity(S.id)}
                    className={cn(
                      'flex items-center justify-center border-[3px] border-[#172b44] px-2 py-2.5 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_#172b44] transition',
                      severity === S.id
                        ? `${S.color} shadow-[1px_1px_0_#172b44] translate-x-[2px] translate-y-[2px]`
                        : 'bg-white text-[#172b44] hover:-translate-y-0.5',
                    )}
                  >
                    {S.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* When */}
            <Section title="4 · When? (optional)" icon={Clock}>
              <input
                type="text"
                value={whenHappened}
                onChange={(e) => setWhenHappened(e.target.value)}
                placeholder="e.g. Breakfast today, Dinner 12th Oct, Just now"
                maxLength={120}
                className="w-full border-[3px] border-[#172b44] bg-white px-3 py-2.5 text-sm font-semibold text-[#172b44] shadow-[3px_3px_0_#172b44] outline-none placeholder:text-[#172b44]/40 focus:bg-[#fffdf4]"
              />
            </Section>

            {/* Dietary note */}
            <Section title="5 · Dietary note (if relevant, optional)" icon={Leaf}>
              <input
                type="text"
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="e.g. Jain / vegan / gluten allergy / found egg in veg"
                maxLength={200}
                className="w-full border-[3px] border-[#172b44] bg-white px-3 py-2.5 text-sm font-semibold text-[#172b44] shadow-[3px_3px_0_#172b44] outline-none placeholder:text-[#172b44]/40 focus:bg-[#fffdf4]"
              />
            </Section>

            {/* Details */}
            <Section title="6 · Short description" icon={UtensilsCrossed}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={1800}
                placeholder="What did you see/taste? One or two lines is enough."
                className="w-full resize-none border-[3px] border-[#172b44] bg-white px-3 py-2.5 text-sm font-semibold text-[#172b44] shadow-[3px_3px_0_#172b44] outline-none placeholder:text-[#172b44]/40 focus:bg-[#fffdf4]"
              />
              <div className="mt-1 text-right text-[10px] font-bold text-[#172b44]/60">
                {description.length}/1800
              </div>
            </Section>

            {/* Photos (optional — AI doesn't detect food hygiene) */}
            <Section title="7 · Photo evidence (optional)" icon={Camera}>
              {/* Camera input: capture="environment" opens the rear camera
                  directly on phones for quick snaps. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              {/* Gallery input: NO capture attribute — on phones this
                  opens the photo library / Files / gallery picker so
                  users can attach screenshots, photos they took
                  earlier, or images from WhatsApp/DCIM. */}
              <input
                type="file"
                accept="image/*"
                multiple
                id="fh-gallery-input"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden border-[3px] border-[#172b44] bg-black shadow-[3px_3px_0_#172b44]"
                  >
                    <img src={img.dataUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center border-[2px] border-[#172b44] bg-[#ef6b59] text-white shadow-[2px_2px_0_#172b44] transition hover:bg-[#b91c1c]"
                    >
                      <X className="h-3 w-3" strokeWidth={3} />
                    </button>
                    <span className="absolute bottom-1 left-1 border-[2px] border-[#172b44] bg-[#fffdf4] px-1 py-0.5 text-[9px] font-black uppercase text-[#172b44]">
                      {img.sizeKb}KB
                    </span>
                  </div>
                ))}
                {images.length < ANON_IMAGE_LIMITS.maxFiles && !imageProcessing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 border-[3px] border-dashed border-[#172b44] bg-[#fff8e7] text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:-translate-y-0.5 hover:bg-[#ffd630]"
                    >
                      <Camera className="h-5 w-5" strokeWidth={2.5} />
                      <span className="text-[10px] font-black uppercase leading-tight">Take photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('fh-gallery-input')?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 border-[3px] border-dashed border-[#172b44] bg-[#fff8e7] text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:-translate-y-0.5 hover:bg-[#91dcc4]"
                    >
                      <ImagePlus className="h-5 w-5" strokeWidth={2.5} />
                      <span className="text-[10px] font-black uppercase leading-tight">Upload from gallery</span>
                    </button>
                  </>
                )}
                {imageProcessing && (
                  <div className="flex aspect-square flex-col items-center justify-center gap-1 border-[3px] border-dashed border-[#172b44] bg-[#fff8e7] text-[#172b44] shadow-[3px_3px_0_#172b44]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-[10px] font-black uppercase leading-tight">Scrubbing…</span>
                  </div>
                )}
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-snug text-[#172b44]/75">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f766e]" />
                Photos are re-encoded in your browser before upload — EXIF
                metadata (GPS location, camera serial, time, phone model) is
                wiped automatically. Max {ANON_IMAGE_LIMITS.maxFiles} photos.
                Tap <strong>Take photo</strong> to snap one now, or <strong>Upload
                from gallery</strong> to pick one you already took (gallery,
                screenshots, DCIM, WhatsApp images all work).
              </p>
              {imageError && (
                <p className="mt-1.5 text-[11px] font-bold text-[#b91c1c]">{imageError}</p>
              )}
            </Section>

            {error && (
              <div className="border-[3px] border-[#172b44] bg-[#ef6b59]/10 px-3 py-2 text-xs font-bold text-[#b91c1c] shadow-[3px_3px_0_#172b44]">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'group flex w-full items-center justify-center gap-2 border-[4px] border-[#172b44] px-5 py-4 text-sm font-black uppercase tracking-wider shadow-[6px_6px_0_#172b44] transition',
                  canSubmit
                    ? 'bg-[#ffd630] text-[#172b44] hover:-translate-y-0.5 hover:bg-[#91dcc4] hover:shadow-[8px_8px_0_#172b44]'
                    : 'cursor-not-allowed bg-[#e2e8f0] text-[#94a3b8] shadow-[2px_2px_0_#172b44]',
                )}
              >
                {phase === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending anonymously…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Send to mess helpline (anonymous)
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] font-bold text-[#172b44]/60">
                By sending you confirm this is a genuine food-safety concern.
                Abuse (spam / hoaxes) is rate-limited per network but never
                traced back to you.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <fieldset className="border-[3px] border-[#172b44] bg-[#fffdf4] p-4 shadow-[4px_4px_0_#172b44]">
      <legend className="flex items-center gap-2 bg-[#ffd630] px-2 py-1 text-xs font-black uppercase tracking-wider text-[#172b44] shadow-[2px_2px_0_#172b44]">
        <Icon className="h-3.5 w-3.5" strokeWidth={3} /> {title}
      </legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-[3px] border-[#172b44] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide shadow-[3px_3px_0_#172b44] transition',
        active
          ? 'bg-[#ffd630] text-[#172b44] shadow-[1px_1px_0_#172b44] translate-x-[2px] translate-y-[2px]'
          : 'bg-white text-[#172b44] hover:-translate-y-0.5 hover:bg-[#91dcc4]',
      )}
    >
      {children}
    </button>
  );
}
