
import sanitizeHtml from 'sanitize-html';

export type HolloMediaAttachment = {
  id: string;
  type: string;
  url: string | null;
  preview_url: string | null;
  description: string | null;
};

export type HolloCard = {
  url: string;
  title: string;
  description: string;
  image: string | null;
  provider_name: string;
  type: string;
};

export type HolloPoll = {
  id: string;
  expires_at: string | null;
  expired: boolean;
  multiple: boolean;
  votes_count: number;
  voters_count: number | null;
  voted: boolean;
  own_votes: number[];
  options: {
    title: string;
    votes_count: number | null;
  }[];
};

export type HolloQuotedStatus = {
  id: string;
  url?: string | null;
  content: string;
  created_at: string;
  account: {
    username: string;
    acct: string;
    display_name: string;
    avatar: string;
    url: string;
  };
};

export type HolloQuote = {
  state: string;
  quoted_status?: HolloQuotedStatus | null;
};

export type HolloStatus = {
  id: string;
  url?: string | null;
  content: string;
  spoiler_text?: string;
  visibility?: string;
  created_at: string;
  favourites_count: number;
  replies_count: number;
  reblogs_count: number;
  favourited: boolean;
  bookmarked: boolean;
  reblogged?: boolean;
  account: {
    id: string;
    username: string;
    acct: string;
    display_name: string;
    avatar: string;
    url: string;
  };
  media_attachments?: HolloMediaAttachment[];
  card?: HolloCard | null;
  poll?: HolloPoll | null;
  quote?: HolloQuote | null;
  reblog?: HolloStatus | null;
};

export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

export function mapStatus(status: HolloStatus, profileId: string) {
  const original = status.reblog ?? status;
  const author = original.account;

  return {
    id: status.id,
    postUrl: original.url ?? status.url ?? null,
    isOwnPost: !status.reblog && author.id === profileId,
    editableContent: plainText(original.content),
    spoilerText: original.spoiler_text ?? '',
    visibility: original.visibility ?? 'public',
    boostedBy: status.reblog
      ? (status.account.display_name || status.account.username)
      : null,
    accountId: author.id,
    name: author.display_name || author.username,
    handle: `@${author.acct}`,
    avatar: author.avatar,
    url: author.url,
    time: original.created_at,
    content: sanitizeHtml(original.content, {
      allowedTags: [
        'p', 'br',
        'strong', 'b',
        'em', 'i',
        'del', 's',
        'blockquote',
        'pre', 'code',
        'ul', 'ol', 'li',
        'a',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr'
      ],
      allowedAttributes: {
        a: ['href', 'title', 'rel'],
        code: ['class']
      },
      allowedSchemes: ['http', 'https', 'mailto']
    }),
    quotedPost: original.quote?.quoted_status
      ? {
          id: original.quote.quoted_status.id,
          postUrl: original.quote.quoted_status.url ?? null,
          name:
            original.quote.quoted_status.account.display_name ||
            original.quote.quoted_status.account.username,
          handle: `@${original.quote.quoted_status.account.acct}`,
          avatar: original.quote.quoted_status.account.avatar,
          url: original.quote.quoted_status.account.url,
          time: original.quote.quoted_status.created_at,
          content: sanitizeHtml(
            original.quote.quoted_status.content,
            {
              allowedTags: [
                'p', 'br',
                'strong', 'b',
                'em', 'i',
                'del', 's',
                'blockquote',
                'pre', 'code',
                'ul', 'ol', 'li',
                'a',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'hr'
              ],
              allowedAttributes: {
                a: ['href', 'title', 'rel'],
                code: ['class']
              },
              allowedSchemes: ['http', 'https', 'mailto']
            }
          )
        }
      : null,
    mediaAttachments: original.media_attachments ?? [],
    card: original.card ?? null,
    poll: original.poll ?? null,
    liked: status.favourited,
    bookmarked: status.bookmarked,
    reposted: status.reblogged ?? false,
    replies: status.replies_count,
    reposts: status.reblogs_count
  };
}
