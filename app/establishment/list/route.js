import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import modelsInstance from '../../../models/index.js';

const validators = [
    authenticate
];

async function handler(req, res, next) {
    const { Establishment } = modelsInstance.models;

    const establishments = await Establishment.findAll({
        where: {
            organizationId: req.organization.id
        },
        order: [['id', 'ASC']]
    });

    const response = establishments.map(est => ({
        id: est.id,
        name: est.name,
        code: est.code,
        address: est.address,
        phone: est.phone,
        establishmentCode: est.establishmentCode,
        emissionPointCode: est.emissionPointCode,
        currentSequential: est.currentSequential,
        documentSequences: JSON.parse(est.documentSequences) ?? [],
        isActive: est.isActive,
        createdAt: est.createdAt,
        updatedAt: est.updatedAt
    }));

    return apiResponse(res, req, next)(response);
}

const establishmentRoute = {
    validators,
    default: handler
};

export default establishmentRoute;
export { validators };