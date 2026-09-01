'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/*
  Returning from an article should put the reader back where they were, not at
  the top of the section.

  A plain <Link href="/#interests"> pushes a NEW history entry and lands on the
  section heading, so the list is scrolled to a different place than the one
  they left and the back stack keeps growing. When the reader actually came from
  the list we call router.back() instead, which unwinds that entry and lets the
  router restore the scroll position.

  Whether they came from the list is a single-use token set when "Read more" was
  clicked. It is consumed on mount, so a deep link, a refresh, or an arrival
  from search finds nothing and gets the ordinary link — which is also what
  renders on the server, keeping hydration stable.
*/
export default function BackToList({ href, children }) {
  const router = useRouter();
  const [canReturn, setCanReturn] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('return-to-list') === '1') {
        window.sessionStorage.removeItem('return-to-list');
        setCanReturn(true);
      }
    } catch {
      /* Storage unavailable — leave it as a plain link. */
    }
  }, []);

  if (!canReturn) {
    return <Link href={href} className="post-back">{children}</Link>;
  }

  return (
    <button type="button" className="post-back" onClick={() => router.back()}>
      {children}
    </button>
  );
}
