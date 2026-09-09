'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Link2, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

/**
 * The two ingestion paths, side by side and equally weighted.
 *
 * Uploading is the one that always works; the link path depends on the
 * Instagram Graph API and only reaches the connected account's own reels. The
 * copy says so rather than letting someone discover it from an error.
 */
export function IngestPanel() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const submit = useCallback(
    async (init: RequestInit) => {
      setPending(true);
      try {
        const response = await fetch('/api/reels', init);
        const body = (await response.json()) as { jobId?: string; error?: string };

        if (!response.ok || !body.jobId) {
          toast.error(body.error ?? 'could not start that job');
          return;
        }
        router.push(`/jobs/${body.jobId}`);
      } catch {
        toast.error('could not reach the server');
      } finally {
        setPending(false);
      }
    },
    [router],
  );

  return (
    <Tabs defaultValue="upload" className="mx-auto w-full max-w-2xl">
      <TabsList>
        <TabsTrigger value="upload">
          <UploadCloud /> Upload a file
        </TabsTrigger>
        <TabsTrigger value="link">
          <Link2 /> Paste a link
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <UploadDropzone pending={pending} onFile={(file) => {
          const form = new FormData();
          form.append('file', file);
          return submit({ method: 'POST', body: form });
        }} />
      </TabsContent>

      <TabsContent value="link">
        <LinkForm pending={pending} onUrl={(url) =>
          submit({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url }),
          })
        } />
      </TabsContent>
    </Tabs>
  );
}

function UploadDropzone({ pending, onFile }: { pending: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`that file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`);
      return;
    }
    onFile(file);
  };

  return (
    <Card>
      <CardContent>
        <div
          role="button"
          tabIndex={0}
          aria-disabled={pending}
          onClick={() => !pending && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (!pending) inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!pending) accept(event.dataTransfer.files[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors',
            dragging ? 'border-primary bg-accent/50' : 'hover:border-muted-foreground/40',
            pending && 'pointer-events-none opacity-60',
          )}
        >
          {pending ? (
            <Loader2 className="text-muted-foreground size-7 animate-spin" />
          ) : (
            <UploadCloud className="text-muted-foreground size-7" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">Drop the video here, or click to choose</p>
            <p className="text-muted-foreground text-xs">
              .mp4, .mov or .webm, up to {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB. Works for any
              reel, yours or not.
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(event) => accept(event.target.files?.[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LinkForm({ pending, onUrl }: { pending: boolean; onUrl: (url: string) => void }) {
  const [url, setUrl] = useState('');

  return (
    <Card>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (url.trim()) onUrl(url.trim());
          }}
        >
          <Input
            type="url"
            inputMode="url"
            placeholder="https://www.instagram.com/reel/…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={pending}
          />
          <Button type="submit" className="w-full" disabled={pending || !url.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Analyse this reel
          </Button>
          <p className="text-muted-foreground text-xs">
            Links resolve through the Instagram Graph API, which only reaches the connected
            professional account&apos;s own reels. Anything else — upload the file instead.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
