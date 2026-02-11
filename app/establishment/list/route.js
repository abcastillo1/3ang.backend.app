import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../models/index.js';

const validators = [
    validateField('data.page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('validators.page.invalid'),
    validateField('data.limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('validators.limit.invalid'),
    validateField('data.search')
        .optional()
        .isString()
        .withMessage('validators.search.invalid'),
    validateField('data.isActive')
        .optional()
        .isBoolean()
        .withMessage('validators.isActive.invalid'),
    validateRequest,
    authenticate,
    requirePermission('establishments.view')
];

async function handler(req, res, next) {
    const { Establishment } = modelsInstance.models;
    const { page = 1, limit = 10, search, isActive } = req.body.data || {};

    const where = {
        organizationId: req.organization.id
    };

    if (search) {
        where[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { code: { [Op.like]: `%${search}%` } },
            { establishmentCode: { [Op.like]: `%${search}%` } },
            { address: { [Op.like]: `%${search}%` } }
        ];
    }

    if (isActive !== undefined) {
        where.isActive = isActive;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const total = await Establishment.count({ where });

    const establishments = await Establishment.findAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['id', 'DESC']]
    });

    const response = {
        establishments: establishments.map(est => {
            return {
                id: est.id,
                name: est.name,
                code: est.code,
                address: est.address,
                phone: est.phone,
                image: est.image,
                establishmentCode: est.establishmentCode,
                emissionPointCode: est.emissionPointCode,
                currentSequential: est.currentSequential,
                documentSequences: est.documentSequences || [],
                isActive: est.isActive,
                createdAt: est.createdAt,
                updatedAt: est.updatedAt
            };
        }),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    };

    return apiResponse(res, req, next)(response);
}

const listRoute = {
    validators,
    default: handler,
    action: 'list',
    entity: 'settings.establishments'
};

export default listRoute;
export { validators };