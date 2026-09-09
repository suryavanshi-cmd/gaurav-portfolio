import { notFound, redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { analysisSchema, type StructureSegment } from '@/lib/providers/analysis/schema';
import { analysisToMarkdown } from '@/lib/markdown';
import { formatCount, formatTimecode } from '@/lib/utils';
import { CopyMarkdownButton } from '@/components/CopyMarkdownButton';
import { StructureTimeline } from '@/components/StructureTimeline';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!(await getUser())) redirect(`/auth?next=/reels/${id}`);

  const supabase = await createClient();

  const { data: reel } = await supabase.from('reels').select('*').eq('id', id).maybeSingle();
  if (!reel) notFound();

  const { data: analysisRow } = await supabase
    .from('analyses')
    .select('*')
    .eq('reel_id', id)
    .maybeSingle();

  // Still processing (or failed) — the status page is the right place to be.
  if (!analysisRow) {
    const { data: job } = await supabase.from('jobs').select('id').eq('reel_id', id).maybeSingle();
    if (job) redirect(`/jobs/${job.id}`);
    notFound();
  }

  // The row was validated on the way in, so a mismatch here means the schema
  // changed under an older analysis. Show what parses rather than 500ing.
  const parsed = analysisSchema.safeParse({
    summary: analysisRow.summary,
    hook_analysis: analysisRow.hook_analysis ?? '',
    structure_breakdown: analysisRow.structure_breakdown ?? [],
    tone: analysisRow.tone ?? '',
    target_audience: analysisRow.target_audience ?? '',
    virality_factors: analysisRow.virality_factors ?? [],
    actionable_takeaways: analysisRow.actionable_takeaways ?? [],
  });

  const analysis = parsed.success
    ? parsed.data
    : {
        summary: analysisRow.summary,
        hook_analysis: analysisRow.hook_analysis ?? '',
        structure_breakdown: [] as StructureSegment[],
        tone: analysisRow.tone ?? '',
        target_audience: analysisRow.target_audience ?? '',
        virality_factors: [],
        actionable_takeaways: [],
      };

  const meta = {
    authorHandle: reel.author_handle,
    instagramUrl: reel.instagram_url,
    caption: reel.caption,
    likeCount: reel.like_count,
    commentCount: reel.comment_count,
    viewCount: reel.view_count,
    durationSeconds: reel.duration_seconds,
  };

  const stats = [
    reel.duration_seconds ? { label: 'Length', value: formatTimecode(reel.duration_seconds) } : null,
    reel.view_count != null ? { label: 'Views', value: formatCount(reel.view_count) } : null,
    reel.like_count != null ? { label: 'Likes', value: formatCount(reel.like_count) } : null,
    reel.comment_count != null ? { label: 'Comments', value: formatCount(reel.comment_count) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="space-y-8 pt-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {reel.author_handle ? `@${reel.author_handle}` : 'Reel analysis'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {reel.source === 'link' ? 'Fetched from a link' : 'Uploaded directly'}
            {analysisRow.model_version ? ` · ${analysisRow.model_version}` : ''}
          </p>
        </div>
        <CopyMarkdownButton markdown={analysisToMarkdown(analysis, meta)} />
      </header>

      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border px-4 py-3">
              <dt className="text-muted-foreground text-xs">{stat.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </CardContent>
      </Card>

      {analysis.hook_analysis && (
        <Card>
          <CardHeader>
            <CardTitle>The hook</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.hook_analysis}</p>
          </CardContent>
        </Card>
      )}

      {analysis.structure_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <StructureTimeline segments={analysis.structure_breakdown} />
            <ul className="space-y-4">
              {analysis.structure_breakdown.map((section, index) => (
                <li key={`${section.section}-${index}`} className="flex gap-4">
                  <div className="w-24 shrink-0">
                    <Badge variant="outline" className="uppercase">
                      {section.section}
                    </Badge>
                    <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                      {formatTimecode(section.start_seconds)}–{formatTimecode(section.end_seconds)}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed">{section.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {analysis.tone && (
          <Card>
            <CardHeader>
              <CardTitle>Tone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{analysis.tone}</p>
            </CardContent>
          </Card>
        )}
        {analysis.target_audience && (
          <Card>
            <CardHeader>
              <CardTitle>Written for</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{analysis.target_audience}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {analysis.virality_factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What made it travel</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {analysis.virality_factors.map((factor, index) => (
                <li key={index} className="border-l-2 border-primary/40 pl-4">
                  <p className="text-sm font-medium">{factor.factor}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{factor.explanation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.actionable_takeaways.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Do this next time</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.actionable_takeaways.map((takeaway, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed">
                  <span className="text-primary mt-0.5 shrink-0 tabular-nums">{index + 1}.</span>
                  {takeaway}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </article>
  );
}
