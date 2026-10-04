import { supabase } from './supabase';

/**
 * Upload a report photo (data URL) to Supabase Storage.
 * Returns the public URL of the stored file.
 */
export async function uploadReportPhoto(dataUrl: string, userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const BUCKET = 'report-photos';
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });

  if (error) {
    const detail = typeof error.message === 'string' && error.message ? error.message : `HTTP ${error.statusCode ?? '?'}`;
    throw new Error(`Photo upload failed (${detail}). Check that the "${BUCKET}" bucket exists and is Public in Supabase → Storage.`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload AI annotated image (data URL) to Supabase Storage.
 * Returns public URL — so email and WhatsApp can include both original and annotated links.
 */
export async function uploadAnnotatedPhoto(dataUrl: string, userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const filePath = `${userId}/annotated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const BUCKET = 'report-photos';
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });

  if (error) {
    // If annotated upload fails, fallback to data URL (still usable in email as attachment)
    console.warn('[storage] annotated upload failed:', error.message);
    return dataUrl;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
