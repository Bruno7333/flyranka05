import { z } from 'zod';

export const BookSchema = z.object({
  title: z.string(),
  product_url: z.string().url(),
  price_text: z.string(),
  price_gbp: z.number(),
  availability_text: z.string(),
  rating_text: z.string().nullable(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string(),
});

export function validateBook(record) {
  try {
    return { success: true, data: BookSchema.parse(record) };
  } catch (e) {
    return { success: false, error: e.errors ? e.errors : e.message };
  }
}
