import { formatCount, formatTimecode } from '@/lib/utils';
import type { ReelAnalysis } from '@/lib/providers/analysis/schema';

export type ReportMeta = {
  authorHandle: string | null;
  instagramUrl: string | null;
  caption: string | null;
  likeCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  durationSeconds: number | null;
};

/** The "copy as markdown" payload — a report that reads well pasted into a doc. */
export function analysisToMarkdown(analysis: ReelAnalysis, meta: ReportMeta): string {
  const lines: string[] = [];

  lines.push(`# Reel analysis${meta.authorHandle ? ` — @${meta.authorHandle}` : ''}`, '');

  const facts: string[] = [];
  if (meta.instagramUrl) facts.push(`- Link: ${meta.instagramUrl}`);
  if (meta.durationSeconds) facts.push(`- Duration: ${formatTimecode(meta.durationSeconds)}`);
  if (meta.viewCount != null) facts.push(`- Views: ${formatCount(meta.viewCount)}`);
  if (meta.likeCount != null) facts.push(`- Likes: ${formatCount(meta.likeCount)}`);
  if (meta.commentCount != null) facts.push(`- Comments: ${formatCount(meta.commentCount)}`);
  if (facts.length) lines.push(...facts, '');

  lines.push('## Summary', '', analysis.summary, '');
  lines.push('## Hook', '', analysis.hook_analysis, '');

  if (analysis.structure_breakdown.length) {
    lines.push('## Structure', '');
    for (const section of analysis.structure_breakdown) {
      lines.push(
        `### ${section.section.toUpperCase()} · ${formatTimecode(section.start_seconds)}–${formatTimecode(section.end_seconds)}`,
        '',
        section.description,
        '',
      );
    }
  }

  lines.push('## Tone', '', analysis.tone, '');
  lines.push('## Target audience', '', analysis.target_audience, '');

  if (analysis.virality_factors.length) {
    lines.push('## What made it travel', '');
    for (const factor of analysis.virality_factors) {
      lines.push(`- **${factor.factor}** — ${factor.explanation}`);
    }
    lines.push('');
  }

  if (analysis.actionable_takeaways.length) {
    lines.push('## Takeaways', '');
    for (const takeaway of analysis.actionable_takeaways) lines.push(`- ${takeaway}`);
    lines.push('');
  }

  if (meta.caption) lines.push('## Caption', '', '> ' + meta.caption.replace(/\n/g, '\n> '), '');

  return lines.join('\n').trim() + '\n';
}
