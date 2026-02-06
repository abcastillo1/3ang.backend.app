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
        .withMessage('validators.organization.id.invalid'),

    validateField('data.name')
        .optional()
        .isLength({ max: 255 })
        .withMessage('validators.organization.name.invalid'),

    validateField('data.legalName')
        .optional()
        .isLength({ max: 255 })
        .withMessage('validators.organization.legalName.invalid'),

    validateField('data.taxId')
        .optional()
        .isLength({ max: 50 })
        .withMessage('validators.organization.taxId.invalid'),

    validateField('data.ruc')
        .optional()
        .isLength({ min: 13, max: 13 })
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

    validateRequest,
    authenticate,
    requirePermission('organizations.update'),
];

async function handler(req, res, next) {
    const { data } = req.body;
    const { Organization } = modelsInstance.models;

    try {
        const organization = await Organization.findByPk(data.id);

        if (!organization) {
            return res.status(404).json({ message: 'validators.organization.notFound' });
        }

        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.image !== undefined) updateData.image = JSON.stringify(data.image);
        if (data.legalName !== undefined) updateData.legalName = data.legalName;
        if (data.taxId !== undefined) updateData.taxId = data.taxId;
        if (data.ruc !== undefined) updateData.ruc = data.ruc;
        if (data.sriRegimen !== undefined) updateData.sriRegimen = data.sriRegimen;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.country !== undefined) updateData.country = data.country;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.isAccountingRequired !== undefined) updateData.isAccountingRequired = data.isAccountingRequired;
        if (data.environment !== undefined) updateData.environment = data.environment;
        if (data.signaturePath !== undefined) updateData.signaturePath = data.signaturePath || null; // Agregado
        if (data.signaturePassword !== undefined) updateData.signaturePassword = data.signaturePassword || null; // Agregado
        if (data.signatureExpiry !== undefined) updateData.signatureExpiry = data.signatureExpiry || null; // Agregado
        if (data.signatureProvider !== undefined) updateData.signatureProvider = data.signatureProvider || null; // Agregado

        await organization.update(updateData);
        await organization.reload();

        const response = {
            organization: organization
        };

        return apiResponse(res, req, next)(response);
    } catch (error) {
        next(error);
    }
}

const updateRoute = {
    validators,
    default: handler,
    action: 'update',
    entity: 'organizations'
};

export default updateRoute;
export { validators };