'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { formatTimecode } from '@/lib/utils';
import type { StructureSegment } from '@/lib/providers/analysis/schema';

const SECTION_COLOR: Record<StructureSegment['section'], string> = {
  hook: 'var(--color-chart-1)',
  body: 'var(--color-chart-3)',
  cta: 'var(--color-chart-2)',
};

/**
 * A Gantt-style read of where each section sits in the reel.
 *
 * Recharts has no range bar, so each row stacks a transparent bar the length of
 * the section's start offset underneath the visible one — which also means gaps
 * between sections stay visible rather than being closed up.
 */
export function StructureTimeline({ segments }: { segments: StructureSegment[] }) {
  if (!segments.length) return null;

  const data = segments.map((segment) => ({
    section: segment.section,
    offset: segment.start_seconds,
    span: Math.max(segment.end_seconds - segment.start_seconds, 0.1),
  }));

  const total = Math.max(...segments.map((segment) => segment.end_seconds));

  return (
    <div className="w-full" style={{ height: data.length * 48 + 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 8 }} barSize={22}>
          <XAxis
            type="number"
            domain={[0, total]}
            tickFormatter={(value: number) => formatTimecode(value)}
            stroke="var(--color-muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="section"
            width={52}
            stroke="var(--color-muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => value.toUpperCase()}
          />
          <Bar dataKey="offset" stackId="timeline" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="span" stackId="timeline" radius={4} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.section} fill={SECTION_COLOR[entry.section]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
