'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <Mail className="text-primary mx-auto size-6" />
        <p className="mt-3 font-medium">Check your email</p>
        <p className="text-muted-foreground mt-1 text-sm">
          We sent a sign-in link to {email}. It opens straight into your account.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);

        const { error } = await createClient().auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

        setPending(false);

        if (error) {
          toast.error(error.message);
          return;
        }
        setSent(true);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending || !email}>
        {pending && <Loader2 className="animate-spin" />}
        Send the link
      </Button>
    </form>
  );
}
