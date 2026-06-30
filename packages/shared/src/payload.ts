import { z } from 'zod';

export const AuthorSchema = z.object({
  handle: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
});

export const MetricsSchema = z.object({
  likes: z.number().int().nonnegative().optional(),
  reposts: z.number().int().nonnegative().optional(),
  views: z.number().int().nonnegative().optional(),
  bookmarks: z.number().int().nonnegative().optional(),
});

export const PostCardSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  domain: z.string().optional(),
  image: z.string().url().optional(),
});

/**
 * Video reference. We store only the poster (thumbnail) — actual X video
 * streams are HLS/auth-gated/ephemeral, so the renderer shows the poster
 * with a play overlay and links back to the post on x.com to actually play.
 * GIFs (X stores them as silent <video> elements) use the same shape.
 */
export const VideoSchema = z.object({
  poster: z.string().url(),
});

/**
 * A quoted post embedded in another post. URL is stored as host+path
 * (e.g. `x.com/handle/status/123`) to match the encoding used for `src`
 * and keep payloads compact.
 */
export const QuoteSchema = z.object({
  /* Host+path permalink of the quoted post, e.g. `x.com/handle/status/123`.
   * Optional because X's DOM only exposes the status id reliably when the
   * quote has media (photo/video permalink anchors); text-only quotes have
   * no static URL we can extract. */
  url: z.string().min(1).optional(),
  author: AuthorSchema,
  text: z.string(),
  timestamp: z.string().datetime({ offset: true }),
  images: z.array(z.string().url()).optional(),
  videos: z.array(VideoSchema).optional(),
});

export const PostSchema = z.object({
  author: AuthorSchema,
  text: z.string(),
  images: z.array(z.string().url()).optional(),
  videos: z.array(VideoSchema).optional(),
  timestamp: z.string().datetime({ offset: true }),
  metrics: MetricsSchema.optional(),
  card: PostCardSchema.optional(),
  quote: QuoteSchema.optional(),
});

export const PayloadSchema = z
  .object({
    posts: z.array(PostSchema).min(1).max(20),
    focal: z.number().int().nonnegative(),
    truncated: z.boolean().optional(),
  })
  .refine((p) => p.focal < p.posts.length, { message: 'focal index out of range' });

export type Author = z.infer<typeof AuthorSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type PostCard = z.infer<typeof PostCardSchema>;
export type Video = z.infer<typeof VideoSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Payload = z.infer<typeof PayloadSchema>;
