/**
 * El presigner por defecto de @aws-sdk/s3-request-presigner hace:
 *   unsignableHeaders.add("content-type")
 * por eso las URLs de PutObject salen con X-Amz-SignedHeaders=host solamente.
 * Para PUT desde el navegador el Content-Type debe ser el mismo que en PutObject;
 * firmarlo incluye content-type en la firma (p. ej. host;content-type) y evita 403 en B2/S3 estrictos.
 */
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { formatUrl } from '@aws-sdk/util-format-url';
import { getEndpointFromInstructions } from '@smithy/middleware-endpoint';
import { HttpRequest } from '@smithy/protocol-http';

const SHA256_HEADER = 'X-Amz-Content-Sha256';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

export class S3PutPresignerSigningContentType extends S3RequestPresigner {
  prepareRequest(
    requestToSign,
    { unsignableHeaders = new Set(), unhoistableHeaders = new Set(), hoistableHeaders = new Set() } = {}
  ) {
    Object.keys(requestToSign.headers)
      .map((h) => h.toLowerCase())
      .filter((h) => h.startsWith('x-amz-server-side-encryption'))
      .forEach((h) => {
        if (!hoistableHeaders.has(h)) unhoistableHeaders.add(h);
      });
    requestToSign.headers[SHA256_HEADER] = UNSIGNED_PAYLOAD;
    const currentHostHeader = requestToSign.headers.host;
    const port = requestToSign.port;
    const expectedHostHeader = `${requestToSign.hostname}${requestToSign.port != null ? `:${port}` : ''}`;
    if (!currentHostHeader || (currentHostHeader === requestToSign.hostname && requestToSign.port != null)) {
      requestToSign.headers.host = expectedHostHeader;
    }
  }
}

export async function getPutObjectSignedUrlSigningContentType(client, command, options = {}) {
  let s3Presigner;
  let region;
  if (typeof client.config.endpointProvider === 'function') {
    const endpointV2 = await getEndpointFromInstructions(command.input, command.constructor, client.config);
    const authScheme = endpointV2.properties?.authSchemes?.[0];
    if (authScheme?.name === 'sigv4a') {
      region = authScheme?.signingRegionSet?.join(',');
    } else {
      region = authScheme?.signingRegion;
    }
    s3Presigner = new S3PutPresignerSigningContentType({
      ...client.config,
      signingName: authScheme?.signingName,
      region: async () => region
    });
  } else {
    s3Presigner = new S3PutPresignerSigningContentType(client.config);
  }

  const presignInterceptMiddleware = (next, context) => async (args) => {
    const { request } = args;
    if (!HttpRequest.isInstance(request)) {
      throw new Error('Request to be presigned is not an valid HTTP request.');
    }
    delete request.headers['amz-sdk-invocation-id'];
    delete request.headers['amz-sdk-request'];
    delete request.headers['x-amz-user-agent'];
    let presigned;
    const presignerOptions = {
      ...options,
      signingRegion: options.signingRegion ?? context['signing_region'] ?? region,
      signingService: options.signingService ?? context['signing_service']
    };
    if (context.s3ExpressIdentity) {
      presigned = await s3Presigner.presignWithCredentials(request, context.s3ExpressIdentity, presignerOptions);
    } else {
      presigned = await s3Presigner.presign(request, presignerOptions);
    }
    return {
      response: {},
      output: {
        $metadata: { httpStatusCode: 200 },
        presigned
      }
    };
  };

  const clientStack = client.middlewareStack.clone();
  clientStack.addRelativeTo(presignInterceptMiddleware, {
    name: 'presignInterceptMiddlewareSigningContentType',
    relation: 'before',
    toMiddleware: 'awsAuthMiddleware',
    override: true
  });
  const handler = command.resolveMiddleware(clientStack, client.config, {});
  const { output } = await handler({ input: command.input });
  return formatUrl(output.presigned);
}
