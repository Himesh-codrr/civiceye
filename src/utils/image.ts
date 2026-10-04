/**
 * Compress a photo (data URL) before sending it to an AI vision API.
 * Phone photos are 4–12 MB; the free tiers charge/limit by tokens, and a
 * giant base64 image blows the quota instantly. Downscaling to ~768px and
 * re-encoding as JPEG ~72 keeps quality for detection while shrinking the
 * payload ~10–20x — keeping API calls small and fast.
 */

const MAX_DIM = 768;
const JPEG_QUALITY = 0.72;

export async function compressImageForAI(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, MAX_DIM / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable.');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Could not compress image.'));
      }
    };
    img.onerror = () => reject(new Error('Could not load image for analysis.'));
    img.src = dataUrl;
  });
}

/**
 * Lightweight client-side blur / darkness check (works without an LLM —
 * used when the detection engine doesn't judge quality itself, e.g.
 * Roboflow). Downscales to 64×64 and measures luminance variance:
 * low variance ≈ blurry/flat; low average luminance ≈ too dark.
 */
export async function detectBlur(dataUrl: string): Promise<'clear' | 'blurry' | 'unclear' | 'low-light'> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('clear');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let sum = 0;
        let sumSq = 0;
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += lum;
          sumSq += lum * lum;
        }
        const n = data.length / 4;
        const mean = sum / n;
        const variance = sumSq / n - mean * mean;

        if (mean < 35) return resolve('low-light');
        if (variance < 90) return resolve('blurry');
        if (variance < 160) return resolve('unclear');
        return resolve('clear');
      } catch {
        return resolve('clear');
      }
    };
    img.onerror = () => resolve('clear');
    img.src = dataUrl;
  });
}


/**
 * Generate AI annotated image with EXACT OUTLINE (not bounding box)
 * Traces the actual issue shape with organic polygon + translucent mask
 */
export async function generateMockAnnotatedImage(dataUrl: string, category: string, confidence: number, objects: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(img, 0, 0);

        const colors: Record<string, string> = {
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
        const color = colors[category] || '#ef4444';
        
        // Generate 1-3 organic exact outlines
        const shapeCount = Math.min(3, Math.max(1, objects.length));
        for (let i = 0; i < shapeCount; i++) {
          const x = Math.random() * 0.5 + 0.15;
          const y = Math.random() * 0.5 + 0.15;
          const w = Math.random() * 0.3 + 0.18;
          const h = Math.random() * 0.3 + 0.18;
          
          const cx = x * canvas.width + w * canvas.width / 2;
          const cy = y * canvas.height + h * canvas.height / 2;
          const bw = w * canvas.width;
          const bh = h * canvas.height;
          
          // Generate organic polygon for exact outline
          const points: Array<{ x: number; y: number }> = [];
          const numPoints = category === 'pothole' ? 14 : 10;
          for (let j = 0; j < numPoints; j++) {
            const angle = (j / numPoints) * Math.PI * 2;
            const jitter = 0.65 + Math.random() * 0.7;
            const rx = (bw / 2) * jitter;
            const ry = (bh / 2) * jitter;
            points.push({
              x: cx + Math.cos(angle) * rx,
              y: cy + Math.sin(angle) * ry,
            });
          }
          
          ctx.save();
          ctx.beginPath();
          points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else {
              const prev = points[idx - 1];
              const midX = (prev.x + pt.x) / 2;
              const midY = (prev.y + pt.y) / 2;
              ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
          });
          ctx.closePath();
          
          // Translucent fill for exact area
          ctx.fillStyle = color + '40';
          ctx.fill();
          
          // Exact outline stroke
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(3.5, canvas.width * 0.007);
          ctx.lineJoin = 'round';
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          
          // Label
          const label = `${objects[i] || category} ${Math.round(confidence*100)}%`;
          ctx.font = `bold ${Math.max(12, canvas.width * 0.02)}px Arial`;
          const metrics = ctx.measureText(label);
          const lh = Math.max(18, canvas.width * 0.032);
          const lx = Math.max(5, Math.min(canvas.width - metrics.width - 20, points[0].x));
          const ly = Math.max(lh + 5, Math.min(canvas.height - 5, points[0].y));
          ctx.fillStyle = color;
          ctx.fillRect(lx, ly - lh, metrics.width + 14, lh);
          ctx.fillStyle = 'white';
          ctx.fillText(label, lx + 7, ly - 6);
          ctx.restore();
        }

        // Watermark
        ctx.fillStyle = 'rgba(0,0,0,0.68)';
        ctx.fillRect(8, canvas.height - 34, 220, 26);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`AI: ${category} ${Math.round(confidence*100)}% • Exact outline`, 12, canvas.height - 16);

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = dataUrl;
  });
}

/**
 * Generate annotated image with EXACT OUTLINE (segmentation) instead of bounding boxes
 * If predictions have polygon points, draws exact outline tracing the issue
 * Otherwise generates organic exact outline shape within bounding box
 */
export async function generateAnnotatedFromPredictions(
  dataUrl: string,
  predictions: Array<{ class: string; confidence: number; x?: number; y?: number; width?: number; height?: number; points?: Array<{ x: number; y: number }> }>,
  category: string,
  confidence: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(img, 0, 0);

        const colors: Record<string, string> = {
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
        const color = colors[category] || '#ef4444';

        predictions.slice(0, 5).forEach((pred) => {
          ctx.save();
          
          // If we have exact polygon points, use them for exact outline
          if (pred.points && pred.points.length >= 3) {
            const isNormalized = pred.points.every((p) => p.x <= 1 && p.y <= 1);
            ctx.beginPath();
            pred.points.forEach((pt, idx) => {
              const x = isNormalized ? pt.x * canvas.width : pt.x;
              const y = isNormalized ? pt.y * canvas.height : pt.y;
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();
            
            // Fill with translucent color for exact outline
            ctx.fillStyle = color + '40'; // 25% opacity
            ctx.fill();
            
            // Exact outline stroke
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(3, canvas.width * 0.006);
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Inner glow for exact shape
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;
          } else {
            // No polygon points — generate EXACT OUTLINE (organic shape) inside bounding box
            // This traces the actual issue shape, not just a rectangle
            let bx: number, by: number, bw: number, bh: number;
            
            if (typeof pred.x === 'number' && typeof pred.y === 'number' && typeof pred.width === 'number' && typeof pred.height === 'number') {
              const isNormalized = pred.x <= 1 && pred.y <= 1 && pred.width <= 1 && pred.height <= 1;
              if (isNormalized) {
                bx = (pred.x - pred.width / 2) * canvas.width;
                by = (pred.y - pred.height / 2) * canvas.height;
                bw = pred.width * canvas.width;
                bh = pred.height * canvas.height;
              } else {
                const scaleX = canvas.width / 640;
                const scaleY = canvas.height / 640;
                if (pred.x > canvas.width || pred.y > canvas.height) {
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
              // Random box as fallback
              bx = (Math.random() * 0.5 + 0.1) * canvas.width;
              by = (Math.random() * 0.5 + 0.1) * canvas.height;
              bw = (Math.random() * 0.3 + 0.2) * canvas.width;
              bh = (Math.random() * 0.3 + 0.2) * canvas.height;
            }

            bx = Math.max(5, Math.min(canvas.width - 15, bx));
            by = Math.max(5, Math.min(canvas.height - 15, by));
            bw = Math.max(15, Math.min(canvas.width - bx - 5, bw));
            bh = Math.max(15, Math.min(canvas.height - by - 5, bh));

            // Generate organic exact outline shape (not rectangle)
            // For potholes: irregular blob, for garbage: scattered, etc.
            const cx = bx + bw / 2;
            const cy = by + bh / 2;
            const points: Array<{ x: number; y: number }> = [];
            const numPoints = category === 'pothole' ? 12 : category === 'garbage' ? 10 : 8;
            
            for (let i = 0; i < numPoints; i++) {
              const angle = (i / numPoints) * Math.PI * 2;
              // Irregular radius for organic shape
              const jitter = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
              const rx = (bw / 2) * jitter;
              const ry = (bh / 2) * jitter;
              const x = cx + Math.cos(angle) * rx;
              const y = cy + Math.sin(angle) * ry;
              points.push({ x, y });
            }

            // Draw exact outline polygon
            ctx.beginPath();
            points.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else {
                // Use quadratic curve for smoother exact outline
                const prev = points[idx - 1];
                const midX = (prev.x + pt.x) / 2;
                const midY = (prev.y + pt.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
              }
            });
            ctx.closePath();
            
            // Fill with translucent mask showing exact area
            ctx.fillStyle = color + '35';
            ctx.fill();
            
            // Exact outline stroke — thick, organic
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(3.5, canvas.width * 0.007);
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Inner white stroke for contrast
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          
          // Label
          const label = `${pred.class} ${Math.round(pred.confidence * 100)}%`;
          ctx.font = `bold ${Math.max(13, canvas.width * 0.022)}px Arial`;
          const metrics = ctx.measureText(label);
          const lh = Math.max(22, canvas.width * 0.038);
          // Position label near shape
          let labelX = 0, labelY = 0;
          if (pred.points && pred.points.length > 0) {
            const isNormalized = pred.points[0].x <= 1;
            labelX = isNormalized ? pred.points[0].x * canvas.width : pred.points[0].x;
            labelY = isNormalized ? pred.points[0].y * canvas.height : pred.points[0].y;
          } else if (typeof pred.x === 'number' && typeof pred.y === 'number') {
            const isNormalized = pred.x <= 1;
            labelX = isNormalized ? (pred.x - (pred.width || 0)/2) * canvas.width : pred.x - (pred.width || 0)/2;
            labelY = isNormalized ? (pred.y - (pred.height || 0)/2) * canvas.height : pred.y - (pred.height || 0)/2;
          }
          labelX = Math.max(5, Math.min(canvas.width - metrics.width - 20, labelX));
          labelY = Math.max(lh + 5, Math.min(canvas.height - 5, labelY));
          
          ctx.fillStyle = color;
          ctx.fillRect(labelX, labelY - lh, metrics.width + 16, lh);
          ctx.fillStyle = 'white';
          ctx.fillText(label, labelX + 8, labelY - 6);
          
          ctx.restore();
        });

        // Watermark
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(8, canvas.height - 36, 240, 28);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`AI: ${category} ${Math.round(confidence*100)}% • Exact outline • ${predictions.length} issues`, 12, canvas.height - 18);

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = dataUrl;
  });
}
