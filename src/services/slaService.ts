import type { Report, Severity } from '@/types';

export type SLAStatus = 'on-track' | 'at-risk' | 'breached';

export interface SLACheck {
  deadline: string;
  status: SLAStatus;
  hoursLeft: number;
  escalated: boolean;
  level: number;
  nextEscalationInHours: number;
}

const SLA_HOURS: Record<Severity, number> = {
  critical: 24,
  high: 48,
  medium: 7 * 24,
  low: 14 * 24,
};

export function getSLADeadline(report: Report): Date {
  const created = new Date(report.date).getTime();
  const hours = SLA_HOURS[report.severity] || 7 * 24;
  return new Date(created + hours * 60 * 60 * 1000);
}

export function getSLAStatus(report: Report): SLACheck {
  const now = Date.now();
  const deadline = getSLADeadline(report);
  const deadlineMs = deadline.getTime();
  const hoursLeft = (deadlineMs - now) / (1000 * 60 * 60);
  const totalHours = SLA_HOURS[report.severity] || 7 * 24;
  
  let status: SLAStatus = 'on-track';
  if (hoursLeft <= 0) status = 'breached';
  else if (hoursLeft <= totalHours * 0.25) status = 'at-risk';
  
  const escalated = report.escalation ? report.escalation.level > 0 : false;
  const level = report.escalation?.level || 0;
  
  // Next escalation: critical escalates every 12h after breach, others every 48h
  const escalationInterval = report.severity === 'critical' ? 12 : 48;
  const nextEscalationInHours = status === 'breached' 
    ? Math.max(0, escalationInterval - (Math.abs(hoursLeft) % escalationInterval))
    : hoursLeft;

  return {
    deadline: deadline.toISOString(),
    status,
    hoursLeft,
    escalated,
    level,
    nextEscalationInHours,
  };
}

export function shouldAutoEscalate(report: Report): boolean {
  if (report.status === 'resolved' || report.status === 'rejected') return false;
  const check = getSLAStatus(report);
  return check.status === 'breached' && !check.escalated;
}

export function getEscalationTarget(report: Report): string {
  const level = report.escalation?.level || 0;
  if (report.scope === 'campus') {
    if (level === 0) return 'Estate Office';
    if (level === 1) return 'Dean / Director Office';
    return 'Vice Chancellor Office';
  } else {
    if (level === 0) return 'BBMP Zone Office';
    if (level === 1) return 'BBMP Commissioner';
    if (level === 2) return 'BBMP Chief Commissioner + Mayor';
    return 'State Urban Development Dept';
  }
}

export function formatSLATime(hoursLeft: number): string {
  if (hoursLeft <= 0) {
    const overdue = Math.abs(hoursLeft);
    if (overdue < 24) return `${Math.round(overdue)}h overdue`;
    return `${Math.round(overdue / 24)}d overdue`;
  }
  if (hoursLeft < 24) return `${Math.round(hoursLeft)}h left`;
  return `${Math.round(hoursLeft / 24)}d left`;
}
