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

    validateField('data.legalName')
        .optional()
        .isLength({ max: 255 }),

    validateField('data.taxId')
        .notEmpty()
        .withMessage('validators.taxId.required')
        .isLength({ max: 50 }),

    validateField('data.ruc')
        .optional()
        .isLength({ min: 13, max: 13 })
        .withMessage('validators.ruc.invalid'),

    validateField('data.email')
        .optional()
        .isEmail()
        .withMessage('validators.email.invalid'),

    validateField('data.environment')
        .optional()
        .isIn(['pruebas', 'produccion'])
        .withMessage('validators.environment.invalid'),

    validateField('data.isAccountingRequired')
        .optional()
        .isBoolean()
        .withMessage('validators.isAccountingRequired.invalid'),

    /* validateField('data.signatureExpiry')
        .optional()
        .isDate()
        .withMessage('validators.signatureExpiry.invalid'), */

    validateRequest,
    authenticate,
    requirePermission('organizations.create'),
];

async function handler(req, res, next) {
    const { data } = req.body;
    const { Organization } = modelsInstance.models;

    // Validación de unicidad para TaxID (o RUC según tu lógica)
    if (data.taxId) {
        const existing = await Organization.findOne({
            where: { taxId: data.taxId }
        });
        if (existing) {
            return res.status(400).json({
                message: 'validators.taxId.unique'
            });
        }
    }

    const organizationData = {
        ownerUserId: req.user.id, // El creador suele ser el dueño inicial
        name: data.name,
        image: data.image || null,
        legalName: data.legalName || null,
        taxId: data.taxId,
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
        console.log(error);
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