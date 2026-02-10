import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';

const validators = [
    validateField('data.id')
        .notEmpty()
        .isInt({ min: 1 })
        .withMessage('validators.establishment.id.invalid'),

    validateField('data.name')
        .optional()
        .isLength({ max: 255 })
        .withMessage('validators.establishment.name.invalid'),

    validateField('data.code')
        .optional()
        .isString()
        .withMessage('validators.establishment.code.invalid'),

    validateField('data.establishmentCode')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('validators.establishment.establishmentCode.invalid'),

    validateField('data.emissionPointCode')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('validators.establishment.emissionPointCode.invalid'),

    validateField('data.currentSequential')
        .optional()
        .isInt({ min: 0 })
        .withMessage('validators.establishment.currentSequential.invalid'),

    validateField('data.documentSequences')
        .optional()
        .isArray()
        .withMessage('validators.establishment.documentSequences.invalid'),

    validateField('data.address')
        .optional()
        .isString(),

    validateField('data.phone')
        .optional()
        .isString(),

    validateField('data.isActive')
        .optional()
        .isBoolean()
        .withMessage('validators.establishment.isActive.invalid'),

    validateRequest,
    authenticate,
    requirePermission('establishments.update'),
];

async function handler(req, res, next) {
    const { data } = req.body;
    const { Establishment } = modelsInstance.models;

    try {
        // Buscamos el establecimiento asegurando que pertenezca a la organización del usuario
        const establishment = await Establishment.findOne({
            where: {
                id: data.id,
                organizationId: req.user.organizationId
            }
        });

        if (!establishment) {
            return res.status(404).json({ message: 'Establishment not found' });
        }

        if (data.code) {
            const { Op } = await import('sequelize');
            const existing = await Establishment.findOne({
                where: {
                    code: data.code,
                    organizationId: req.user.organizationId,
                    id: { [Op.ne]: data.id } // Excluye el registro actual
                }
            });

            if (existing) {
                return res.status(400).json({
                    message: 'validators.establishment.code.unique'
                });
            }
        }

        // Mapeo de campos permitidos para actualizar
        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.establishmentCode !== undefined) updateData.establishmentCode = data.establishmentCode;
        if (data.emissionPointCode !== undefined) updateData.emissionPointCode = data.emissionPointCode;
        if (data.currentSequential !== undefined) updateData.currentSequential = data.currentSequential;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.documentSequences !== undefined) {
            updateData.documentSequences = data.documentSequences ? JSON.stringify(data.documentSequences) : null;
        }

        await establishment.update(updateData);
        await establishment.reload();

        const response = {
            establishment: establishment
        };

        return apiResponse(res, req, next)(response);
    } catch (error) {
        console.log(error);
        next(error);
    }
}

const updateRoute = {
    validators,
    default: handler,
    action: 'update',
    entity: 'establishments'
};

export default updateRoute;
export { validators };