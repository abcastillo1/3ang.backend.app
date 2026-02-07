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
    requirePermission('settings.organizations.view') // Ajusta el permiso según tu sistema
];

async function handler(req, res, next) {
    const { Organization } = modelsInstance.models;
    const { page = 1, limit = 10, search, isActive } = req.body.data || {};

    const where = {};

    if (search) {
        where[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { legalName: { [Op.like]: `%${search}%` } },
            { taxId: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
        ];
    }

    if (isActive !== undefined) {
        where.isActive = isActive;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const total = await Organization.count({ where });

    const organizations = await Organization.findAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['id', 'ASC']]
    });

    const response = {
        organizations: organizations.map(org => {

            return {
                id: org.id,
                name: org.name,
                legalName: org.legalName,
                taxId: org.taxId,
                email: org.email,
                phone: org.phone,
                address: org.address,
                country: org.country,
                city: org.city,
                image: org.image ?? null,
                isActive: org.isActive,
                createdAt: org.createdAt,
                updatedAt: org.updatedAt
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
    entity: 'settings.organizations'
};

export default listRoute;
export { validators };