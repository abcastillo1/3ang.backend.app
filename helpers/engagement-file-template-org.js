import { throwError } from './errors.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Valor de `engagementFileTemplateId` en API para aplicar la plantilla embebida del producto (sin fila en BD).
 */
export const SYSTEM_ENGAGEMENT_FILE_TEMPLATE_KEY = 'system';

export function isSystemEngagementTemplateRef(value) {
  return value === SYSTEM_ENGAGEMENT_FILE_TEMPLATE_KEY;
}

/**
 * Resuelve la plantilla de la firma a usar en CRUD de secciones cuando el body trae `engagementFileTemplateId`,
 * o la marcada `isDefault` si no viene.
 */
export async function resolveOrgTemplateId(models, organizationId, requestedTemplateId, transaction) {
  const { EngagementFileTemplate } = models;
  if (requestedTemplateId != null && requestedTemplateId !== '') {
    const t = await EngagementFileTemplate.findOne({
      where: { id: requestedTemplateId, organizationId },
      transaction
    });
    if (!t) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.engagementTemplateNotFound');
    }
    return t.id;
  }
  const def = await EngagementFileTemplate.findOne({
    where: { organizationId, isDefault: true },
    transaction
  });
  if (!def) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.noDefaultEngagementTemplate');
  }
  return def.id;
}
