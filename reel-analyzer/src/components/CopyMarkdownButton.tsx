'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error('your browser blocked the clipboard');
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : 'Copy as markdown'}
    </Button>
  );
}
