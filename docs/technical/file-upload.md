# Carga de archivos (URLs prefirmadas — Backblaze B2)

Este documento describe cómo funciona la subida de archivos en la plataforma: el servidor **nunca recibe el archivo**; el frontend sube directamente al bucket usando una URL prefirmada.

---

## 1. Resumen del flujo

1. **Frontend** pide al API una URL prefirmada (POST `/api/v1/files/upload-url`) con metadata del archivo.
2. **Backend** valida permisos, genera la URL (PUT) y devuelve `uploadUrl` + `key`.
3. **Frontend** hace **PUT** del archivo directamente a `uploadUrl` (contra Backblaze B2).
4. Si el PUT responde **200**, el **Frontend** llama a POST `/api/v1/files/confirm` con el `key` y metadata para registrar el documento y obtener la URL de descarga.

---

## 2. Endpoints del API

### POST `/api/v1/files/upload-url`

Solicita una URL prefirmada para subir un archivo.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "data": {
    "name": "informe.pdf",
    "mimeType": "application/pdf",
    "size": 102400,
    "category": "audit_evidences",
    "auditCaseId": 5
  }
}
```

| Campo         | Tipo   | Obligatorio | Descripción |
|--------------|--------|-------------|-------------|
| `name`       | string | Sí          | Nombre original del archivo |
| `mimeType`   | string | Sí          | Tipo MIME (ej. `application/pdf`, `image/jpeg`) |
| `size`       | number | Sí          | Tamaño en bytes (máx. 40 MB) |
| `category`   | string | Sí          | Una de: `audit_evidences`, `fiscal_reports`, `company_docs`, `profiles` |
| `auditCaseId`| number | No          | ID del caso de auditoría (si aplica) |

**Respuesta exitosa (200):**
```json
{
  "statusCode": 200,
  "message": "...",
  "data": {
    "uploadUrl": "https://s3.us-west-004.backblazeb2.com/bynegosas/1/audit_evidences/5/uuid.pdf?X-Amz-...",
    "key": "1/audit_evidences/5/abc-123.pdf",
    "expiresIn": 300,
    "contentType": "application/pdf"
  }
}
```

- **uploadUrl:** URL donde el frontend debe hacer el **PUT** con el archivo. Caduca en **5 minutos** (300 s).
- **key:** Identificador del objeto en el bucket; hay que enviarlo en `/confirm`.
- **contentType:** Debe coincidir con el `Content-Type` del PUT.

---

### POST `/api/v1/files/confirm`

Registra que el archivo ya fue subido, **persiste la metadata en la tabla `audit_documents`** y devuelve la URL de descarga (prefirmada).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "data": {
    "key": "1/audit_evidences/5/abc-123.pdf",
    "originalName": "informe.pdf",
    "mimeType": "application/pdf",
    "size": 102400,
    "category": "audit_evidences",
    "auditCaseId": 5,
    "auditProjectId": 5,
    "nodeId": 12
  }
}
```

| Campo           | Tipo   | Obligatorio | Descripción |
|----------------|--------|-------------|-------------|
| `key`          | string | Sí          | El mismo devuelto por `upload-url`; debe pertenecer a la organización del usuario. |
| `originalName` | string | Sí          | Nombre original del archivo. |
| `mimeType`     | string | Sí          | Tipo MIME. |
| `size`         | number | Sí          | Tamaño en bytes. |
| `category`     | string | Sí          | Una de las categorías permitidas. |
| `auditCaseId`  | number | No          | Alias de `auditProjectId` (compatibilidad). |
| `auditProjectId` | number | No        | ID del proyecto de auditoría; si se envía, debe existir y pertenecer a la organización. |
| `nodeId`       | number | No          | ID del nodo/carpeta en el árbol del proyecto (cuando exista `audit_tree_node`). |

**Respuesta exitosa (200):**
```json
{
  "statusCode": 200,
  "message": "...",
  "data": {
    "document": {
      "id": 1,
      "key": "1/audit_evidences/5/abc-123.pdf",
      "originalName": "informe.pdf",
      "mimeType": "application/pdf",
      "size": 102400,
      "category": "audit_evidences",
      "auditProjectId": 5,
      "nodeId": null,
      "uploaderId": 1,
      "organizationId": 1,
      "downloadUrl": "https://s3.us-west-004.backblazeb2.com/...?X-Amz-...",
      "analysisStatus": "pending"
    }
  }
}
```

- **id:** ID del registro en `audit_documents`.
- **downloadUrl:** URL prefirmada de lectura; caduca según `STORAGE_SIGNED_URL_EXPIRY` (ej. 3600 s).

---

## 3. Qué retorna Backblaze B2 al hacer el PUT

Cuando el **frontend** hace **PUT** del archivo a la **uploadUrl** (contra `https://s3.us-west-004.backblazeb2.com/...`):

- **Éxito:**  
  - **Status:** `200 OK`  
  - **Cuerpo:** vacío o XML mínimo (no hay JSON útil).  
  - Algunas respuestas incluyen header `ETag`.

- **Error:**  
  - **Status:** 4xx (ej. 403 si la URL expiró o el `Content-Type` no coincide con el firmado).  
  - **Cuerpo:** XML de error (formato S3).

**Importante:** el frontend debe basarse en el **código HTTP**:
- **200** → subida correcta → llamar a POST `/api/v1/files/confirm`.
- **4xx** → no llamar a `confirm`; mostrar error (revisar URL expirada, `Content-Type`, etc.).

---

## 4. Flujo recomendado en el frontend

```javascript
// 1. Obtener URL prefirmada
const { data: { uploadUrl, key, contentType } } = await api.post('/api/v1/files/upload-url', {
  data: {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    category: 'audit_evidences',
    auditCaseId: caseId || undefined
  }
});

// 2. Subir directamente a B2 (PUT)
const putResponse = await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': contentType   // debe coincidir con el mimeType enviado en upload-url
  }
});

if (!putResponse.ok) {
  throw new Error(`Upload failed: ${putResponse.status}`);
}

// 3. Confirmar en nuestro API (solo si PUT fue 200)
const { data: { document } } = await api.post('/api/v1/files/confirm', {
  data: {
    key,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    category: 'audit_evidences',
    auditCaseId: caseId || undefined
  }
});

// document.downloadUrl es la URL para leer el archivo (temporal)
```

---

## 5. Estructura del key (path en el bucket)

Formato: `{organizationId}/{category}/{auditCaseId|general}/{uniqueFilename}`

- **organizationId:** de la organización del usuario.
- **category:** `audit_evidences`, `fiscal_reports`, `company_docs`, `profiles`.
- **auditCaseId:** número o `general` si no hay caso.
- **uniqueFilename:** UUID + extensión generado por el backend.

Ejemplo: `1/audit_evidences/5/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`

---

## 6. Configuración (variables de entorno)

Para que las URLs prefirmadas funcionen con Backblaze B2:

| Variable | Descripción |
|----------|-------------|
| `STORAGE_PROVIDER` | `backblaze` |
| `B2_APPLICATION_KEY_ID` | Application Key ID de B2 |
| `B2_APPLICATION_KEY` | Application Key de B2 |
| `B2_BUCKET_NAME` | Nombre del bucket |
| `B2_S3_REGION` | Región del bucket (ej. `us-west-004`). Por defecto `us-west-004`. |
| `PRESIGNED_UPLOAD_EXPIRY_SECONDS` | Caducidad de la URL de subida en segundos (por defecto 300 = 5 min). |
| `STORAGE_SIGNED_URL_EXPIRY` | Caducidad de la URL de descarga en segundos (ej. 3600). |

El endpoint S3 de B2 se construye como: `https://s3.{B2_S3_REGION}.backblazeb2.com`. Opcionalmente se puede fijar con `B2_S3_ENDPOINT`.

---

## 7. Categorías y tipos MIME permitidos

| Categoría | Uso |
|-----------|-----|
| `audit_evidences` | Evidencias de auditoría |
| `fiscal_reports` | Reportes fiscales |
| `company_docs` | Documentos de la empresa |
| `profiles` | Imágenes de perfil |

Tipos MIME aceptados en `upload-url`: `application/pdf`, Excel (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`), `image/jpeg`, `image/png`, `image/webp`. Tamaño máximo: 40 MB.

---

## 8. Referencias

- Lógica de negocio: `docs/design/business-logic.md`
- Reglas de carga en el proyecto: `.cursorrules` (sección "CARGA DE ARCHIVOS (FILE UPLOAD - PRESIGNED URLS)")
