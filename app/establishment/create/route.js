import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';

const validators = [
    validateField('data.name')
        .notEmpty()
        .withMessage('validators.name.required')
        .isLength({ max: 255 })
        .withMessage('validators.name.invalid'),

    validateField('data.code')
        .optional()
        .isString()
        .withMessage('validators.code.invalid'),

    validateField('data.establishmentCode')
        .notEmpty()
        .withMessage('validators.establishmentCode.required')
        .isLength({ min: 3, max: 3 })
        .withMessage('validators.establishmentCode.invalid'), // Ej: '001'

    validateField('data.emissionPointCode')
        .notEmpty()
        .withMessage('validators.emissionPointCode.required')
        .isLength({ min: 3, max: 3 })
        .withMessage('validators.emissionPointCode.invalid'), // Ej: '001'

    validateField('data.currentSequential')
        .optional()
        .isInt({ min: 0 })
        .withMessage('validators.currentSequential.invalid'),

    validateField('data.documentSequences')
        .optional()
        .isArray()
        .withMessage('validators.documentSequences.invalid'),

    validateField('data.address')
        .optional()
        .isString(),

    validateField('data.phone')
        .optional()
        .isString(),

    validateRequest,
    authenticate,
    requirePermission('establishments.create'),
];

async function handler(req, res, next) {
    const { data } = req.body;
    const { Establishment } = modelsInstance.models;


    if (data.code) {
        const existing = await Establishment.findOne({
            where: {
                code: data.code,
                organizationId: req.user.organizationId
            }
        });
        if (existing) {
            return res.status(400).json({
                message: 'validators.code.unique'
            });
        }
    }

    const establishmentData = {
        organizationId: req.user.organizationId, // Tomado del token de autenticación
        name: data.name,
        code: data.code || null,
        establishmentCode: data.establishmentCode,
        emissionPointCode: data.emissionPointCode,
        currentSequential: data.currentSequential || 0,
        documentSequences: data.documentSequences ? JSON.stringify(data.documentSequences) : [],
        address: data.address || null,
        phone: data.phone || null,
        isActive: true
    };

    try {
        const newEstablishment = await Establishment.create(establishmentData);

        const response = {
            establishment: newEstablishment
        };

        return apiResponse(res, req, next)(response);
    } catch (error) {
        next(error);
    }
}

const createRoute = {
    validators,
    default: handler,
    action: 'create',
    entity: 'establishments'
};

export default createRoute;
export { validators };