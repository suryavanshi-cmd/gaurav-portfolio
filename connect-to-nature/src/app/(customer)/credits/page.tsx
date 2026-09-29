import type { Metadata } from 'next';
import { CreditsList } from '@/components/CreditsList';

export const metadata: Metadata = {
  title: 'Photograph credits',
  description:
    'Every photograph on Connect to Nature, where it was taken, who took it, and the licence it is reused under.',
};

/* Most of these pictures are CC BY-SA, which asks for the photographer's name
   and a link to the licence wherever the picture is used. Each one carries its
   credit in place; this page is the whole list in one readable column, and the
   link the footer points at. */
export default function CreditsPage() {
  return <CreditsList />;
}
