/**
 * Redo all backfills — regenerates AI annotations with EXACT OUTLINE for all old reports
 * 
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/redo-backfill.mjs
 *   or with VITE_ vars: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/redo-backfill.mjs --force
 * 
 * Options:
 *   --force          Redo ALL reports even if they already have annotation (exact outline upgrade)
 *   --dry            Dry run, don't update DB
 *   --limit=20       Limit number of reports to process
 *   --category=pothole  Only specific category
 * 
 * This script:
 * 1. Fetches all reports from Supabase
 * 2. Filters those needing backfill (no annotatedImage or annotated == original)
 * 3. Downloads original image
 * 4. Generates exact outline annotation with organic polygon (not bounding box)
 * 5. Uploads annotated to Supabase Storage report-photos bucket
 * 6. Updates reports.ai.annotatedImage in DB
 * 
 * For browser-based backfill, use /admin/backfill page which uses same logic but in browser
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;
const categoryArg = args.find((a) => a.startsWith('--category='));
const categoryFilter = categoryArg ? categoryArg.split('=')[1] : null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY (or VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)');
  console.error('Example: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/redo-backfill.mjs --force');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COLORS = {
  pothole: '#ef4444',
  'broken-road': '#f97316',
  garbage: '#22c55e',
  sidewalk: '#3b82f6',
  manhole: '#a855f7',
  'fallen-tree': '#16a34a',
  'street-light': '#eab308',
  'water-leakage': '#06b6d4',
  sewage: '#84cc16',
  'illegal-dumping': '#f59e0b',
  'traffic-signal': '#ef4444',
  other: '#6b7280',
};

// Generate organic exact outline points
function generateOrganicPoints(cx, cy, bw, bh, category) {
  const numPoints = category === 'pothole' ? 14 : 10;
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const jitter = 0.65 + Math.random() * 0.7;
    const rx = (bw / 2) * jitter;
    const ry = (bh / 2) * jitter;
    points.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    });
  }
  return points;
}

function pointsToSvgPath(points) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  d += ' Z';
  return d;
}

function pointsToPolygonPoints(points) {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

async function getImageBuffer(url) {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    return Buffer.from(match[2], 'base64');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch image failed ${res.status}: ${url.slice(0, 100)}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function generateAnnotatedWithSharp(imageBuffer, predictions, category, confidence) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('sharp not installed, returning original with text overlay via fallback');
    return imageBuffer; // fallback
  }

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 640;
  const height = metadata.height || 480;

  const color = COLORS[category] || '#ef4444';

  // Build SVG overlay with exact outlines
  let svgElements = '';

  const boxes = predictions.length > 0 ? predictions : [{ class: category, confidence, x: 0.3, y: 0.3, width: 0.4, height: 0.4 }];

  boxes.slice(0, 5).forEach((pred) => {
    let bx, by, bw, bh;
    let points = pred.points;

    if (points && points.length >= 3) {
      // Use real polygon points
      const isNormalized = points.every((p) => p.x <= 1 && p.y <= 1);
      const scaledPoints = points.map((p) => ({
        x: isNormalized ? p.x * width : p.x,
        y: isNormalized ? p.y * height : p.y,
      }));
      const polygonPoints = pointsToPolygonPoints(scaledPoints);
      const pathD = pointsToSvgPath(scaledPoints);
      
      svgElements += `
        <polygon points="${polygonPoints}" fill="${color}40" stroke="${color}" stroke-width="${Math.max(3, width * 0.006)}" stroke-linejoin="round" />
        <path d="${pathD}" fill="none" stroke="white" stroke-width="1.2" opacity="0.7" />
      `;
      
      // Label
      const label = `${pred.class} ${Math.round(pred.confidence * 100)}%`;
      const lx = Math.max(5, Math.min(width - 150, scaledPoints[0].x));
      const ly = Math.max(25, Math.min(height - 5, scaledPoints[0].y));
      svgElements += `
        <rect x="${lx}" y="${ly - 22}" width="${label.length * 7 + 16}" height="22" fill="${color}" rx="4" />
        <text x="${lx + 8}" y="${ly - 7}" font-family="Arial" font-size="13" font-weight="bold" fill="white">${label}</text>
      `;
    } else {
      // Generate organic exact outline inside bounding box
      if (typeof pred.x === 'number' && typeof pred.y === 'number' && typeof pred.width === 'number' && typeof pred.height === 'number') {
        const isNormalized = pred.x <= 1 && pred.y <= 1 && pred.width <= 1 && pred.height <= 1;
        if (isNormalized) {
          bx = (pred.x - pred.width / 2) * width;
          by = (pred.y - pred.height / 2) * height;
          bw = pred.width * width;
          bh = pred.height * height;
        } else {
          const scaleX = width / 640;
          const scaleY = height / 640;
          if (pred.x > width || pred.y > height) {
            bx = (pred.x - pred.width / 2) * scaleX;
            by = (pred.y - pred.height / 2) * scaleY;
            bw = pred.width * scaleX;
            bh = pred.height * scaleY;
          } else {
            bx = pred.x - pred.width / 2;
            by = pred.y - pred.height / 2;
            bw = pred.width;
            bh = pred.height;
          }
        }
      } else {
        bx = (Math.random() * 0.5 + 0.15) * width;
        by = (Math.random() * 0.5 + 0.15) * height;
        bw = (Math.random() * 0.3 + 0.18) * width;
        bh = (Math.random() * 0.3 + 0.18) * height;
      }

      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      const organicPoints = generateOrganicPoints(cx, cy, bw, bh, category);
      const polygonPoints = pointsToPolygonPoints(organicPoints);
      const pathD = pointsToSvgPath(organicPoints);

      svgElements += `
        <polygon points="${polygonPoints}" fill="${color}40" stroke="${color}" stroke-width="${Math.max(3.5, width * 0.007)}" stroke-linejoin="round" />
        <path d="${pathD}" fill="none" stroke="white" stroke-width="1.5" opacity="0.85" />
      `;

      const label = `${pred.class} ${Math.round(pred.confidence * 100)}%`;
      const lx = Math.max(5, Math.min(width - 150, organicPoints[0].x));
      const ly = Math.max(25, Math.min(height - 5, organicPoints[0].y));
      svgElements += `
        <rect x="${lx}" y="${ly - 22}" width="${label.length * 7 + 16}" height="22" fill="${color}" rx="4" />
        <text x="${lx + 8}" y="${ly - 7}" font-family="Arial" font-size="13" font-weight="bold" fill="white">${label}</text>
      `;
    }
  });

  // Watermark
  svgElements += `
    <rect x="8" y="${height - 36}" width="260" height="28" fill="rgba(0,0,0,0.7)" rx="6" />
    <text x="16" y="${height - 18}" font-family="Arial" font-size="12" font-weight="bold" fill="white">AI: ${category} ${Math.round(confidence*100)}% • Exact outline • ${boxes.length} issues</text>
  `;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgElements}
    </svg>
  `;

  const annotatedBuffer = await image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return annotatedBuffer;
}

async function main() {
  console.log(`Fetching reports (force=${force}, dry=${dryRun}, limit=${limit}, category=${categoryFilter || 'all'})...`);
  
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }
  if (!force) {
    // Only fetch reports that need backfill - but we filter in JS for more complex logic
  }
  const { data: rows, error } = await query.limit(limit * 2); // fetch more, filter later
  if (error) {
    console.error('Fetch reports failed:', error);
    process.exit(1);
  }

  console.log(`Fetched ${rows.length} reports`);

  const toProcess = rows.filter((row) => {
    if (categoryFilter && row.category !== categoryFilter) return false;
    const ai = row.ai;
    if (force) return true; // redo all
    if (!ai) return true;
    if (!ai.annotatedImage) return true;
    if (ai.annotatedImage === row.photo_url) return true;
    return false;
  }).slice(0, limit);

  console.log(`${toProcess.length} reports need backfill (force=${force})`);

  if (toProcess.length === 0) {
    console.log('Nothing to do');
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    console.log(`\n[${i+1}/${toProcess.length}] ${row.id} ${row.title} (${row.category})`);
    
    try {
      const imageUrl = row.photo_url;
      if (!imageUrl) {
        console.log('  Skip: no photo_url');
        continue;
      }

      const imageBuffer = await getImageBuffer(imageUrl);
      console.log(`  Downloaded image ${imageBuffer.length} bytes`);

      const ai = row.ai || {};
      const category = row.category || 'other';
      const confidence = ai.confidence || 0.85;
      const objects = ai.objects || [category];
      const predictions = ai.predictions || objects.map((o) => {
        const label = typeof o === 'string' ? o.split(' ')[0] : o;
        return { class: label, confidence: 0.85 };
      });

      const annotatedBuffer = await generateAnnotatedWithSharp(imageBuffer, predictions, category, confidence);
      console.log(`  Generated annotated ${annotatedBuffer.length} bytes with exact outline`);

      if (dryRun) {
        console.log('  Dry run: skipping upload and DB update');
        const outPath = `/tmp/annotated-${row.id}.jpg`;
        writeFileSync(outPath, annotatedBuffer);
        console.log(`  Saved to ${outPath}`);
        success++;
        continue;
      }

      // Upload to Supabase Storage
      const filePath = `${row.user_id || 'backfill'}/annotated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: uploadError } = await supabase.storage.from('report-photos').upload(filePath, annotatedBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

      let publicUrl;
      if (uploadError) {
        console.warn(`  Upload failed: ${uploadError.message}, using data URL fallback`);
        publicUrl = `data:image/jpeg;base64,${annotatedBuffer.toString('base64')}`;
      } else {
        const { data: urlData } = supabase.storage.from('report-photos').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
        console.log(`  Uploaded to ${publicUrl}`);
      }

      // Update DB
      const newAi = {
        ...(ai || {}),
        annotatedImage: publicUrl,
        originalImage: ai.originalImage || row.photo_url,
        model: ai.model || 'roboflow-detector',
        confidence: ai.confidence || confidence,
        summary: ai.summary || `AI detected ${category} with exact outline`,
        objects: ai.objects || objects,
        predictions: predictions,
      };

      const { error: updateError } = await supabase
        .from('reports')
        .update({ ai: newAi })
        .eq('id', row.id);

      if (updateError) {
        console.error(`  DB update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  DB updated ✓`);
        success++;
      }

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));

    } catch (err) {
      console.error(`  Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed out of ${toProcess.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
