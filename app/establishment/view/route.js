import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import modelsInstance from '../../../models/index.js';

const validators = [
    validateField('data.id')
        .notEmpty()
        .withMessage('validators.establishment.id.required')
        .isInt({ min: 1 })
        .withMessage('validators.establishment.id.invalid'),
    validateRequest,
    authenticate,
    requirePermission('establishments.view')
];

async function handler(req, res, next) {
    const { Establishment } = modelsInstance.models;
    const { id } = req.body.data;

    try {
        const establishment = await Establishment.findOne({
            where: {
                id,
                organizationId: req.organization.id
            }
        });

        if (!establishment) {
            return res.status(404).json({
                message: 'validators.establishment.notFound'
            });
        }

        const response = {
            establishment: {
                id: establishment.id,
                name: establishment.name,
                code: establishment.code,
                address: establishment.address,
                phone: establishment.phone,
                image: establishment.image,
                establishmentCode: establishment.establishmentCode,
                emissionPointCode: establishment.emissionPointCode,
                currentSequential: establishment.currentSequential,
                documentSequences: establishment.documentSequences || [],
                isActive: establishment.isActive,
                createdAt: establishment.createdAt,
                updatedAt: establishment.updatedAt
            }
        };

        return apiResponse(res, req, next)(response);
    } catch (error) {
        next(error);
    }
}

const viewRoute = {
    validators,
    default: handler,
    action: 'view',
    entity: 'settings.establishments'
};

export default viewRoute;
export { validators };
