import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import modelsInstance from '../../../models/index.js';

const validators = [
    validateField('data.id')
        .notEmpty()
        .withMessage('validators.organization.id.required')
        .isInt({ min: 1 })
        .withMessage('validators.organization.id.invalid'),
    validateRequest,
    authenticate,
    requirePermission('organizations.view')
];

async function handler(req, res, next) {
    const { Organization } = modelsInstance.models;
    const { id } = req.body.data;

    try {
        const organization = await Organization.findByPk(id);

        if (!organization) {
            return res.status(404).json({
                message: 'validators.organization.notFound'
            });
        }

        const response = {
            organization: organization
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
    entity: 'organizations'
};

export default viewRoute;
export { validators };
