import { load } from 'cheerio';

export function extractRawFromDetail(html, productUrl, sourcePage, fetchedAt) {
  const $ = load(html);
  const title = $('div.product_main h1').text().trim() || null;
  const price_text = $('p.price_color').first().text().trim() || null;
  const availability_text = $('p.instock.availability').text().trim().replace(/\n/g, ' ').trim() || null;
  // rating: class on <p class="star-rating Three">
  const rating_p = $('p.star-rating').first();
  const rating_classes = rating_p.attr('class') || '';
  const rating_text = rating_classes.split(/\s+/).filter(Boolean).slice(1).join(' ') || null;

  // description: the <p> after #product_description h2
  let description = null;
  const descHeading = $('#product_description');
  if (descHeading.length) {
    const p = descHeading.nextAll('p').first();
    if (p.length) description = p.text().trim();
  }

  return {
    title,
    product_url: productUrl,
    price_text,
    availability_text,
    rating_text,
    description: description === '' ? null : description,
    source_page: sourcePage,
    fetched_at: fetchedAt
  };
}
