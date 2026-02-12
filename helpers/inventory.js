/**
 * Devuelve image y gallery del producto usando el get del modelo (ya parseados).
 * Normaliza gallery a array para la respuesta de la API.
 * @param {object} product - Instancia de InventoryProduct (get ya devuelve objeto/array)
 * @returns {{ image: object|null, gallery: array }}
 */
export function parseProductImages(product) {
  const image = product.image ?? null;
  const gallery = Array.isArray(product.gallery) ? product.gallery : [];
  return { image, gallery };
}
