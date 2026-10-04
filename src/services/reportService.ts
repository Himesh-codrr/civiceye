import type { Profile, Report, ReportStatus, VoteType } from '@/types';
import { supabase } from '@/lib/supabase';
import type { BrandId } from '@/types';

/**
 * Real report database backed by Supabase Postgres.
 *
 * Mirrors the shape the frontend expects (`Report`) so pages didn't have
 * to change when we moved off the mock JSON. All reads are public; all
 * writes require an authenticated user (see supabase/schema.sql + RLS).
 * Reports carry a `scope` ('city' | 'campus') so Amrita Eye only sees
 * campus posts.
 */

export interface ReportRow {
  id: string;
  code: string;
  user_id: string | null;
  author_name: string;
  title: string;
  description: string;
  category: Report['category'];
  severity: Report['severity'];
  status: ReportStatus;
  scope: 'city' | 'campus';
  lat: number;
  lng: number;
  location_name: string | null;
  photo_url: string | null;
  ai: unknown;
  proof: unknown;
  escalation: unknown;
  sla: unknown;
  upvotes: number;
  downvotes: number;
  confirms: number;
  rejects: number;
  verified: boolean;
  assigned_to: string | null;
  created_at: string;
}

export function mapRow(row: ReportRow): Report {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    coordinates: { lat: row.lat, lng: row.lng },
    locationName: row.location_name ?? '',
    category: row.category,
    severity: row.severity,
    status: row.status,
    scope: row.scope,
    image: row.photo_url ?? '',
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    votes: row.upvotes - row.downvotes,
    confirms: row.confirms,
    rejects: row.rejects,
    date: row.created_at,
    verified: row.verified,
    author: row.author_name,
    assignedTo: row.assigned_to ?? undefined,
    userId: row.user_id ?? undefined,
    ai: (row.ai as any) ?? null,
    proof: (row.proof as any) ?? null,
    escalation: (row.escalation as any) ?? null,
    sla: (row.sla as any) ?? null,
  };
}

export const reportService = {
  /** All reports, newest first — optionally scoped to city or campus. */
  async getAll(scope?: 'city' | 'campus' | 'all'): Promise<Report[]> {
    if (!supabase) return [];
    let query = supabase.from('reports').select('*');
    if (scope === 'city' || scope === 'campus') query = query.eq('scope', scope);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ReportRow[]).map(mapRow);
  },

  async getById(idOrCode: string): Promise<Report | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .or(`id.eq.${idOrCode},code.eq.${idOrCode}`)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data as ReportRow) : undefined;
  },

  /** Create a report. `photoUrl` is already uploaded to storage. */
  async create(input: {
    title: string;
    description: string;
    coordinates: { lat: number; lng: number };
    locationName: string;
    category: Report['category'];
    severity: Report['severity'];
    photoUrl: string;
    author: string;
    userId: string;
    scope: 'city' | 'campus';
    ai?: unknown;
  }): Promise<Report> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('reports')
      .insert({
        user_id: input.userId,
        author_name: input.author,
        title: input.title,
        description: input.description,
        category: input.category,
        severity: input.severity,
        scope: input.scope,
        lat: input.coordinates.lat,
        lng: input.coordinates.lng,
        location_name: input.locationName,
        photo_url: input.photoUrl,
        ai: input.ai ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data as ReportRow);
  },

  /** Community vote via the atomic `vote_on_report` RPC. */
  async vote(id: string, voteType: VoteType): Promise<Report | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase.rpc('vote_on_report', {
      p_report: id,
      p_vote: voteType,
    });
    if (error) throw error;
    return data ? mapRow(data as ReportRow) : undefined;
  },

  /** Authority actions. */
  async markResolved(id: string, resolverName?: string): Promise<Report | undefined> {
    if (!supabase) {
      await this.updateStatus(id, 'resolved');
      return undefined;
    }
    const { data, error } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Best-effort thank-you email to the original reporter. Fire-and-forget
    // so dashboard UX never blocks on SMTP.
    const reporterUserId = (data as any)?.user_id;
    let reporterEmail: string | null = null;
    let reporterFullName: string | null = (data as any)?.author_name || null;
    if (reporterUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', reporterUserId)
        .maybeSingle();
      if (profile) {
        reporterEmail = (profile as any).email || null;
        reporterFullName = (profile as any).full_name || reporterFullName;
      }
    }
    if (reporterEmail) {
      const webhookSecret = (import.meta as any)?.env?.VITE_EMAIL_WEBHOOK_SECRET || '';
      fetch('/api/report-resolved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({
          report: {
            id: data.id,
            code: (data as any).code,
            title: data.title,
            locationName: (data as any).location_name,
            scope: (data as any).scope,
            author: reporterFullName || 'Citizen',
            reporterEmail,
            resolverName: resolverName || 'the concerned authority',
            resolvedAt: new Date().toISOString(),
          },
        }),
      }).catch((e) => console.warn('[report-resolved] notification email failed:', e));
    }

    return data ? mapRow(data as ReportRow) : undefined;
  },

  async markInProgress(id: string, assignedTo: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('reports')
      .update({ status: 'in-progress', assigned_to: assignedTo, verified: true })
      .eq('id', id);
    if (error) throw error;
  },

  async rejectReport(id: string): Promise<void> {
    await this.updateStatus(id, 'rejected');
  },

  async updateStatus(id: string, status: ReportStatus): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    if (error) throw error;
  },

  /** Admin: permanently take down a post. */
  async remove(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
  },

  /** Admin: move a report between City (CivicEye) and Campus (Amrita Eye). */
  async updateScope(id: string, scope: 'city' | 'campus'): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('reports').update({ scope }).eq('id', id);
    if (error) throw error;
  },

  /** Proof of fix - before/after */
  async addProof(
    id: string,
    proof: {
      beforeImage: string;
      afterImage: string;
      fixedDate: string;
      verifiedByAI?: boolean;
      aiConfidence?: number;
      description?: string;
    },
    resolverName?: string,
  ): Promise<void> {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('reports')
      .update({ proof, status: 'resolved' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Send the same thank-you email to the reporter when proof is submitted.
    const reporterUserId = (data as any)?.user_id;
    let reporterEmail: string | null = null;
    let reporterFullName: string | null = (data as any)?.author_name || null;
    if (reporterUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', reporterUserId)
        .maybeSingle();
      if (profile) {
        reporterEmail = (profile as any).email || null;
        reporterFullName = (profile as any).full_name || reporterFullName;
      }
    }
    if (reporterEmail) {
      const webhookSecret = (import.meta as any)?.env?.VITE_EMAIL_WEBHOOK_SECRET || '';
      fetch('/api/report-resolved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({
          report: {
            id: data.id,
            code: (data as any).code,
            title: (data as any).title,
            locationName: (data as any).location_name,
            scope: (data as any).scope,
            author: reporterFullName || 'Citizen',
            reporterEmail,
            resolverName: resolverName || 'the concerned authority',
            resolvedAt: new Date().toISOString(),
          },
        }),
      }).catch((e) => console.warn('[report-resolved] notification email failed:', e));
    }
  },

  /** SLA escalation */
  async escalate(id: string, escalation: { level: number; escalatedAt: string; reason: string; nextAuthority?: string }): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('reports').update({ escalation }).eq('id', id);
    if (error) throw error;
  },

  /** Update SLA */
  async updateSLA(id: string, sla: { deadline: string; status: 'on-track' | 'at-risk' | 'breached'; escalated: boolean; createdAt: string }): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('reports').update({ sla }).eq('id', id);
    if (error) throw error;
  },
};

/** Resolve a report's public display name from the logged-in profile. */
export function displayName(profile: Profile | null): string {
  if (!profile) return 'Anonymous citizen';
  return profile.full_name?.trim() || profile.email.split('@')[0] || 'Anonymous citizen';
}

/** Brand → report scope for filtering + creation. */
export function scopeForBrand(brand: BrandId): 'city' | 'campus' {
  return brand === 'amrita' ? 'campus' : 'city';
}

