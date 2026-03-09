# Carga de archivos (URLs prefirmadas — Backblaze B2)

Este documento describe cómo funciona la subida de archivos en la plataforma: el servidor **nunca recibe el archivo**; el frontend sube directamente al bucket usando una URL prefirmada. Esto aplica a **todo tipo de archivo**: documentos de auditoría, imágenes de perfil, logos de clientes, etc.

---

## 1. Resumen del flujo

**Todo archivo** (documento de auditoría, imagen de perfil, logo, etc.) se sube así:

1. **Frontend** pide al API una URL prefirmada (POST `/api/v1/files/upload-url`) con metadata del archivo.
2. **Backend** valida permisos, genera la URL (PUT) y devuelve `uploadUrl` + `key`.
3. **Frontend** hace **PUT** del archivo directamente a `uploadUrl` (contra Backblaze B2).
4. Si el PUT responde **200**:
   - **Documentos de auditoría** (`audit_evidences`, `fiscal_reports`, `company_docs`): Frontend llama a POST `/api/v1/files/confirm` → se crea registro en `audit_documents` y se obtiene URL de descarga.
   - **Imágenes de perfil/entidades** (`profiles`): **No se llama a `confirm`**. El `key` (obtenido en el paso 2) se guarda directamente en el campo de la entidad (ej. `user.image`, `client.logo`). Cuando se necesite mostrar la imagen, se usa POST `/api/v1/files/download-url` para obtener una URL de descarga temporal.

**No existe upload multipart al API.** Todo pasa por URLs prefirmadas.

### Documentos sin proyecto asignado

Cuando se crean documentos de auditoría y aún **no existe el proyecto** (ej. el usuario sube archivos mientras llena el formulario de creación), el flujo es:

1. Subir con `confirm` sin enviar `auditProjectId` → se crea el `AuditDocument` como "huérfano" (sin proyecto).
2. Crear el proyecto y obtener su ID.
3. Vincular los documentos al proyecto con POST `/api/v1/files/link`.

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

### POST `/api/v1/files/download-url`

Genera una URL prefirmada de descarga para cualquier archivo existente en el bucket. Útil para: mostrar imágenes de perfil, regenerar URLs expiradas, etc.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "data": {
    "key": "1/profiles/general/uuid.jpg"
  }
}
```

| Campo | Tipo   | Obligatorio | Descripción |
|-------|--------|-------------|-------------|
| `key` | string | Sí          | Storage key del archivo. Debe pertenecer a la organización del usuario. |

**Respuesta exitosa (200):**
```json
{
  "statusCode": 200,
  "message": "...",
  "data": {
    "downloadUrl": "https://s3.us-west-004.backblazeb2.com/...?X-Amz-...",
    "expiresIn": 3600
  }
}
```

No requiere permiso especial, solo autenticación. El key debe iniciar con el `organizationId` del usuario.

---

### POST `/api/v1/files/confirm`

Registra que el archivo ya fue subido, **persiste la metadata en la tabla `audit_documents`** y devuelve la URL de descarga (prefirmada). **Solo para categorías de auditoría** (`audit_evidences`, `fiscal_reports`, `company_docs`). No acepta `profiles`.

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

### POST `/api/v1/files/link`

Vincula documentos ya subidos (sin proyecto) a un proyecto de auditoría. Útil cuando el usuario sube archivos antes de crear el proyecto.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "data": {
    "documentIds": [1, 2, 3],
    "auditProjectId": 5,
    "nodeId": 12
  }
}
```

| Campo           | Tipo     | Obligatorio | Descripción |
|----------------|----------|-------------|-------------|
| `documentIds`  | number[] | Sí          | IDs de documentos a vincular (deben estar sin proyecto asignado y pertenecer a la organización). |
| `auditProjectId` | number | Sí          | ID del proyecto al que vincular. |
| `nodeId`       | number   | No          | Nodo/carpeta del árbol (cuando exista). |

**Respuesta exitosa (200):**
```json
{
  "statusCode": 200,
  "message": "...",
  "data": {
    "linked": [1, 2, 3],
    "auditProjectId": 5,
    "count": 3
  }
}
```

Solo se vinculan documentos que cumplan: pertenecen a la organización del usuario Y no tienen proyecto asignado (`auditProjectId IS NULL`). Documentos ya vinculados a otro proyecto se ignoran silenciosamente.

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

## 4. Flujos recomendados en el frontend

### 4a. Documento de auditoría (con proyecto conocido)

```javascript
// 1. Obtener URL prefirmada
const { data: { uploadUrl, key, contentType } } = await api.post('/api/v1/files/upload-url', {
  data: { name: file.name, mimeType: file.type, size: file.size, category: 'audit_evidences' }
});

// 2. Subir a B2
await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });

// 3. Confirmar → crea registro en audit_documents
const { data: { document } } = await api.post('/api/v1/files/confirm', {
  data: { key, originalName: file.name, mimeType: file.type, size: file.size,
          category: 'audit_evidences', auditProjectId: projectId }
});
// document.id, document.downloadUrl disponibles
```

### 4b. Documento de auditoría (proyecto aún no existe)

```javascript
// 1-2. Igual: upload-url → PUT
// 3. Confirmar SIN proyecto → documento "huérfano"
const { data: { document } } = await api.post('/api/v1/files/confirm', {
  data: { key, originalName: file.name, mimeType: file.type, size: file.size,
          category: 'audit_evidences' }
});
orphanDocIds.push(document.id);

// ... el usuario llena el formulario y crea el proyecto CON los documentIds ...
const { data: { project } } = await api.post('/api/v1/projects/create', {
  data: {
    name: 'Auditoría 2025 - Cliente XYZ',
    clientId: 1,
    auditType: 'financial',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    documentIds: orphanDocIds   // ← vincula documentos en la misma creación
  }
});
// proyecto creado + documentos ya vinculados, sin llamada extra
```

**Patrón general:** Las APIs de creación/actualización de entidades aceptan `documentIds` (array opcional) para vincular documentos en la misma operación. Esto aplica a: proyectos, ítems de checklist, procedimientos, hallazgos, etc. El endpoint `/files/link` sigue disponible para vincular documentos a entidades que ya existen.

### 4c. Imagen de perfil / logo (no es documento de auditoría)

```javascript
// 1. Obtener URL prefirmada
const { data: { uploadUrl, key, contentType } } = await api.post('/api/v1/files/upload-url', {
  data: { name: file.name, mimeType: file.type, size: file.size, category: 'profiles' }
});

// 2. Subir a B2
await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });

// 3. NO se llama a /confirm. Guardar el key en la entidad directamente.
await api.post('/api/v1/users/update', {
  data: { image: key }
});

// 4. Cuando se necesite mostrar la imagen, obtener URL de descarga:
const { data: { downloadUrl } } = await api.post('/api/v1/files/download-url', {
  data: { key }
});
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
