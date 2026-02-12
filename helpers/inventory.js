/**
 * Parses image and gallery from product (stored as JSON string in DB) to the same
 * structure returned by the file upload API, for API responses.
 * @param {object} product - Product instance or plain object with image, gallery
 * @returns {{ image: object|null, gallery: array }}
 */
export function parseProductImages(product) {
  let image = product.image ?? null;
  let gallery = product.gallery ?? null;

  if (typeof image === 'string' && image.trim() !== '') {
    try {
      image = JSON.parse(image);
    } catch {
      image = null;
    }
  }
  if (typeof gallery === 'string' && gallery.trim() !== '') {
    try {
      gallery = JSON.parse(gallery);
    } catch {
      gallery = [];
    }
  }
  if (gallery != null && !Array.isArray(gallery)) {
    gallery = [];
  }

  return { image, gallery };
}
