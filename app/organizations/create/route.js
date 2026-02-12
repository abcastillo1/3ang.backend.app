import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';

const validators = [
    validateField('data.name')
        .notEmpty()
        .withMessage('validators.organization.name.required')
        .isLength({ max: 255 })
        .withMessage('validators.organization.name.invalid'),

    validateField('data.legalName')
        .optional()
        .isLength({ max: 255 }),

    validateField('data.ruc')
        .optional()
        .matches(/^(\d{10}|\d{10}001)$/)
        .withMessage('validators.organization.ruc.invalid'),

    validateField('data.email')
        .optional()
        .isEmail()
        .withMessage('validators.organization.email.invalid'),

    validateField('data.environment')
        .optional()
        .isIn(['pruebas', 'produccion'])
        .withMessage('validators.organization.environment.invalid'),

    validateField('data.isAccountingRequired')
        .optional()
        .isBoolean()
        .withMessage('validators.organization.isAccountingRequired.invalid'),

    validateField('data.phone')
        .optional()
        .isNumeric()
        .withMessage('validators.organization.phone.invalid'),
    validateRequest,
    authenticate,
    requirePermission('organizations.create'),
];

async function handler(req, res, next) {
    const { data } = req.body;
    const { Organization } = modelsInstance.models;

    // Validación de unicidad para RUC
    if (data.ruc) {
        const existing = await Organization.findOne({
            where: { ruc: data.ruc }
        });
        if (existing) {
            return res.status(400).json({
                message: 'validators.organization.ruc.unique'
            });
        }
    }

    const organizationData = {
        ownerUserId: req.user.id, // El creador suele ser el dueño inicial
        name: data.name,
        image: data.image || null,
        legalName: data.legalName || null,
        ruc: data.ruc || null,
        sriRegimen: data.sriRegimen || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        country: data.country || null,
        city: data.city || null,
        isActive: true,
        isAccountingRequired: data.isAccountingRequired || false,
        environment: data.environment || 'pruebas',
        signaturePath: data.signaturePath || null,
        signaturePassword: data.signaturePassword || null,
        signatureExpiry: data.signatureExpiry || null,
        signatureProvider: data.signatureProvider || null
    };

    try {
        const newOrganization = await Organization.create(organizationData);

        const response = {
            organization: newOrganization
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
    entity: 'organizations'
};

export default createRoute;
export { validators };