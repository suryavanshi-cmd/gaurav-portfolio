'use client';

import { useEffect, useRef, useState } from 'react';
import { useIntl } from '@/i18n/provider';
import type { Photo as PhotoRecord } from '@/lib/photo-credits';

/* One photograph, in the two formats worth shipping and the three sizes the
   layout actually asks for.
 *
 * The files are encoded ahead of time and committed, so this is a plain <img>
 * rather than next/image: there is no optimiser to wake up on a cold start, no
 * query string to cache-miss on, and the whole ladder is a static file hit.
 * What next/image would have given us — sizes, lazy loading, a placeholder, a
 * reserved box — is cheap enough to do by hand.
 *
 * The blur is a 20-pixel WebP inlined in the markup. It is painted as a
 * background under the real file, so the card is the right colour immediately
 * and the photograph fades onto it rather than snapping in over white. */

export function Photo({
  photo,
  sizes,
  priority = false,
  className = '',
  imgClassName = '',
  rounded = false,
}: {
  photo: PhotoRecord;
  /** What width this will actually be painted at, per breakpoint. */
  sizes: string;
  /** Only ever true for the one photograph above the fold. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  rounded?: boolean;
}) {
  const { tx } = useIntl();
  const img = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  /* An eager photograph above the fold is usually decoded before React ever
     hydrates, so its load event has already come and gone and onLoad will
     never fire. Without this check the picture stays at zero opacity and the
     visitor is left looking at the twenty-pixel placeholder. */
  useEffect(() => {
    if (img.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      className={`relative overflow-hidden bg-[var(--color-line)] ${rounded ? 'rounded-[inherit]' : ''} ${className}`}
      style={{
        backgroundImage: `url("${photo.blur}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <picture>
        <source type="image/avif" srcSet={photo.avif} sizes={sizes} />
        <img
          ref={img}
          src={photo.src}
          alt={tx(photo.alt)}
          width={photo.width}
          height={photo.height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      </picture>
    </div>
  );
}

/* Where the picture was taken and who took it.
 *
 * These are real photographs of real places, reused under a licence that asks
 * for the photographer's name. They are also not photographs of the demo farm
 * they illustrate, which is the more important thing to say, so the place
 * comes first and the credit follows it. */
export function PhotoCredit({ photo, className = '' }: { photo: PhotoRecord; className?: string }) {
  const { tx } = useIntl();
  return (
    <span className={`text-[11px] leading-snug text-[var(--color-muted)] ${className}`}>
      {tx(photo.where)} ·{' '}
      <a
        href={photo.source}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-[var(--color-line)] underline-offset-2 hover:decoration-current"
      >
        {photo.author}
      </a>
      {photo.licenceUrl ? (
        <>
          {' · '}
          <a
            href={photo.licenceUrl}
            target="_blank"
            rel="noreferrer noopener license"
            className="underline decoration-[var(--color-line)] underline-offset-2 hover:decoration-current"
          >
            {photo.licence}
          </a>
        </>
      ) : (
        ` · ${photo.licence}`
      )}
    </span>
  );
}
