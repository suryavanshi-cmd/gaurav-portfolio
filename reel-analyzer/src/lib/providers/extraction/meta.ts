import {
  ExtractionError,
  UPLOAD_INSTEAD,
  type ExtractedReel,
  type ExtractionProvider,
} from './types';
import { extractionApiKey, instagramAccountId } from '@/lib/env';

const GRAPH_VERSION = 'v21.0';
const MEDIA_FIELDS =
  'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count';

type GraphMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
};

type GraphPage = { data?: GraphMedia[]; paging?: { next?: string } };

/**
 * Instagram Graph API — reads the signed-in creator's own media.
 *
 * The important limitation, and the reason the upload path is the primary one:
 * Meta only ever returns media belonging to the token's own professional
 * account. Pasting somebody else's reel cannot work here by design, and comes
 * back as the "upload it instead" error like any other failure.
 *
 * There is also no lookup-by-shortcode endpoint, so a permalink match against
 * the account's media list is the supported way to resolve a pasted URL.
 */
export class MetaExtractionProvider implements ExtractionProvider {
  readonly name = 'instagram-graph';

  isConfigured(): boolean {
    return Boolean(extractionApiKey);
  }

  async extract(instagramUrl: string): Promise<ExtractedReel> {
    const token = extractionApiKey;
    if (!token) {
      throw new ExtractionError(
        `${UPLOAD_INSTEAD} (the Instagram Graph API is not configured on this deployment)`,
      );
    }

    const shortcode = parseShortcode(instagramUrl);
    if (!shortcode) {
      throw new ExtractionError(
        `that doesn't look like an Instagram reel or post URL — ${UPLOAD_INSTEAD}`,
      );
    }

    const media = await this.findMediaByShortcode(shortcode, token);
    if (!media) {
      throw new ExtractionError(
        `that reel isn't on the connected Instagram account — the link path only works for your own reels, so ${UPLOAD_INSTEAD}`,
      );
    }
    if (!media.media_url) {
      throw new ExtractionError(
        `Instagram returned no video file for that reel — ${UPLOAD_INSTEAD}`,
      );
    }

    return {
      videoUrl: media.media_url,
      caption: media.caption ?? null,
      authorHandle: media.username ?? null,
      likeCount: media.like_count ?? null,
      commentCount: media.comments_count ?? null,
      viewCount: await this.fetchPlays(media.id, token),
      durationSeconds: null, // Graph does not expose it; the transcriber reports it instead.
      thumbnailUrl: media.thumbnail_url ?? null,
    };
  }

  /**
   * Walks the account's media list looking for a matching permalink. Capped at
   * a few pages so a large back catalogue cannot stall the request — an older
   * reel than that is a case for uploading the file.
   */
  private async findMediaByShortcode(shortcode: string, token: string): Promise<GraphMedia | null> {
    const base = instagramAccountId
      ? `https://graph.facebook.com/${GRAPH_VERSION}/${instagramAccountId}/media`
      : `https://graph.instagram.com/${GRAPH_VERSION}/me/media`;

    let url: string | undefined = `${base}?fields=${MEDIA_FIELDS}&limit=50&access_token=${encodeURIComponent(token)}`;

    for (let page = 0; page < 5 && url; page += 1) {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new ExtractionError(
          `${UPLOAD_INSTEAD} (Instagram replied ${response.status})`,
          await response.text().catch(() => undefined),
        );
      }
      const body = (await response.json()) as GraphPage;
      const hit = body.data?.find((item) => item.permalink && parseShortcode(item.permalink) === shortcode);
      if (hit) return hit;
      url = body.paging?.next;
    }

    return null;
  }

  /** Play count needs instagram_manage_insights; treat its absence as unknown, not as failure. */
  private async fetchPlays(mediaId: string, token: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}/insights?metric=plays&access_token=${encodeURIComponent(token)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) return null;
      const body = (await response.json()) as {
        data?: { values?: { value?: number }[] }[];
      };
      return body.data?.[0]?.values?.[0]?.value ?? null;
    } catch {
      return null;
    }
  }
}

/** https://www.instagram.com/reel/DAbC123/?igsh=... -> "DAbC123" */
export function parseShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:[^/]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}
