'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push('/');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
