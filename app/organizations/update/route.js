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

    validateField('data.ruc')
        .optional()
        .matches(/^(\d{10}|\d{10}001)$/)
        .withMessage('validators.organization.ruc.invalid'),

    validateField('data.taxId')
        .optional()
        .isLength({ max: 50 })
        .withMessage('validators.organization.taxId.invalid'),

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

    validateField('data.image')
        .optional()
        .isObject()
        .withMessage('validators.organization.image.invalid'),

    validateField('data.phone')
        .optional()
        .isNumeric()
        .withMessage('validators.organization.phone.invalid'),

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

        // Validación de unicidad para RUC (excluyendo el actual)
        if (data.ruc) {
            const { Op } = modelsInstance.Sequelize;
            const existing = await Organization.findOne({
                where: {
                    id: { [Op.ne]: data.id },
                    ruc: data.ruc
                }
            });
            if (existing) {
                return res.status(400).json({
                    message: 'validators.organization.ruc.unique'
                });
            }
        }

        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;

        if (data.image !== undefined) {
            if (typeof data.image === 'string') {
                try {
                    updateData.image = JSON.parse(data.image);
                } catch (e) {
                    updateData.image = data.image;
                }
            } else {
                updateData.image = data.image;
            }
            updateData.image = JSON.stringify(updateData.image);
        }
        if (data.legalName !== undefined) updateData.legalName = data.legalName;
        if (data.ruc !== undefined) updateData.ruc = data.ruc;
        if (data.taxId !== undefined) updateData.taxId = data.taxId;
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

        if (req.user?.id) {
            req.activityContext = { organizationId: organization.id, organizationName: organization.name };
        }

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
    entity: 'organizations',
    activityKey: 'organizations.update'
};

export default updateRoute;
export { validators };