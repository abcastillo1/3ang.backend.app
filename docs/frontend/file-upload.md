# Subida de Archivos — Contratos de API

La subida de archivos usa **URLs firmadas** (presigned URLs). El archivo va directo del navegador al storage (Backblaze B2), sin pasar por el backend. El proceso tiene 3 pasos obligatorios + 1 opcional.

---

## Flujo completo

```
┌────────────┐    PASO 1     ┌─────────┐
│  Frontend  │──────────────>│ Backend │  POST /files/upload-url
│            │<──────────────│         │  ← { uploadUrl, key, expiresIn }
│            │               └─────────┘
│            │    PASO 2     ┌──────────────┐
│            │──────────────>│ Backblaze B2 │  PUT uploadUrl (binario del archivo)
│            │<──────────────│              │  ← 200 OK
│            │               └──────────────┘
│            │    PASO 3     ┌─────────┐
│            │──────────────>│ Backend │  POST /files/confirm
│            │<──────────────│         │  ← { document: { id, downloadUrl, ... } }
│            │               └─────────┘
│            │    PASO 4     ┌─────────┐
│            │  (opcional)   │ Backend │  POST /projects/create (con documentIds)
│            │──────────────>│         │  o POST /files/link
└────────────┘               └─────────┘
```

---

## Paso 1 — Obtener URL firmada

```
POST /api/v1/files/upload-url
Authorization: Bearer <token>
Requiere permiso: files.upload
```

### Request

```json
{
  "data": {
    "name": "balance_2024.pdf",
    "mimeType": "application/pdf",
    "size": 2048000,
    "category": "audit_evidences"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | Sí | Nombre original del archivo (max 255) |
| `mimeType` | string | Sí | Tipo MIME (ver lista abajo) |
| `size` | int | Sí | Tamaño en bytes (max 40 MB = 41943040) |
| `category` | string | Sí | Categoría del archivo (ver tabla abajo) |

### Response (200)

```json
{
  "data": {
    "uploadUrl": "https://s3.us-west-004.backblazeb2.com/bucket/1/audit_evidences/general/uuid.pdf?X-Amz-...",
    "key": "1/audit_evidences/general/uuid.pdf",
    "expiresIn": 300,
    "contentType": "application/pdf"
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `uploadUrl` | URL firmada donde se debe hacer el PUT del archivo. Expira en `expiresIn` segundos (default 300 = 5 min). |
| `key` | Identificador único del archivo en storage. Guardarlo para el paso 3. |
| `expiresIn` | Segundos de vida de la URL. |
| `contentType` | MIME type a usar en el header del PUT. |

### Categorías permitidas

| Categoría | Uso | Crea registro en BD al confirmar |
|-----------|-----|----------------------------------|
| `audit_evidences` | Evidencias de auditoría | Sí → tabla `audit_documents` |
| `fiscal_reports` | Reportes fiscales | Sí → tabla `audit_documents` |
| `company_docs` | Documentos de la empresa | Sí → tabla `audit_documents` |
| `profiles` | Fotos de perfil de usuarios/clientes | No (solo retorna key + URL) |

### MIME types permitidos

| MIME type | Extensión |
|-----------|-----------|
| `application/pdf` | .pdf |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | .xlsx |
| `application/vnd.ms-excel` | .xls |
| `image/jpeg` | .jpg, .jpeg |
| `image/png` | .png |
| `image/webp` | .webp |

### Tamaño máximo: **40 MB** (41943040 bytes)

---

## Paso 2 — Subir archivo directo a B2

Hacer un **PUT** a la `uploadUrl` recibida en el paso 1 con el binario del archivo.

```
PUT <uploadUrl del paso 1>
Content-Type: <contentType del paso 1>
Body: <binario del archivo>
```

- **No enviar** header `Authorization` (la autenticación va dentro de la URL firmada).
- **Sí enviar** el header `Content-Type` con el valor de `contentType` del paso 1.
- Si la URL expiró (pasaron más de 5 min), solicitar una nueva con el paso 1.
- Una respuesta `200` indica que el archivo se subió correctamente al storage.

---

## Paso 3 — Confirmar subida

```
POST /api/v1/files/confirm
Authorization: Bearer <token>
Requiere permiso: files.upload
```

### Request

```json
{
  "data": {
    "key": "1/audit_evidences/general/uuid.pdf",
    "originalName": "balance_2024.pdf",
    "mimeType": "application/pdf",
    "size": 2048000,
    "category": "audit_evidences",
    "auditProjectId": 5,
    "nodeId": 12
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `key` | string | Sí | El `key` recibido en el paso 1 |
| `originalName` | string | Sí | Nombre original del archivo |
| `mimeType` | string | Sí | Tipo MIME |
| `size` | int | Sí | Tamaño en bytes |
| `category` | string | Sí | Misma categoría del paso 1 |
| `auditProjectId` | int | No | Vincular al proyecto de auditoría (solo para categorías de auditoría) |
| `nodeId` | int | No | Vincular al nodo del árbol del proyecto |

### Response para categoría de auditoría (`audit_evidences`, `fiscal_reports`, `company_docs`)

```json
{
  "data": {
    "document": {
      "id": 42,
      "key": "1/audit_evidences/general/uuid.pdf",
      "originalName": "balance_2024.pdf",
      "mimeType": "application/pdf",
      "size": 2048000,
      "category": "audit_evidences",
      "auditProjectId": 5,
      "nodeId": 12,
      "uploaderId": 1,
      "organizationId": 1,
      "downloadUrl": "https://s3.../signed-url...",
      "analysisStatus": "pending"
    }
  }
}
```

**`document.id` es el dato clave** — se usa después para vincular el documento a entidades (proyectos, nodos).

### Response para categoría `profiles`

```json
{
  "data": {
    "document": {
      "key": "1/profiles/general/uuid.jpg",
      "originalName": "avatar.jpg",
      "mimeType": "image/jpeg",
      "size": 150000,
      "category": "profiles",
      "downloadUrl": "https://s3.../signed-url..."
    }
  }
}
```

No se crea registro en BD. El `key` se guarda directamente en el campo correspondiente del usuario o cliente (ej: al hacer `/users/update` con `profileImage: document.key`).

---

## Paso 4 — Vincular documentos a entidades (opcional)

### Opción A: Al crear la entidad (recomendado)

Las APIs de creación de entidades aceptan un campo `documentIds` para vincular documentos en la misma operación:

```json
{
  "data": {
    "name": "Auditoría 2024",
    "clientId": 1,
    "auditType": "financial",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-12-31",
    "documentIds": [42, 43, 44]
  }
}
```

### Opción B: Vincular a una entidad ya existente

```
POST /api/v1/files/link
Authorization: Bearer <token>
Requiere permiso: files.upload
```

### Request

```json
{
  "data": {
    "documentIds": [42, 43],
    "auditProjectId": 5,
    "nodeId": 12
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `documentIds` | int[] | Sí | IDs de documentos a vincular (min 1). Solo documentos sin proyecto asignado. |
| `auditProjectId` | int | Sí | ID del proyecto al que vincular |
| `nodeId` | int | No | ID del nodo del árbol |

### Response (200)

```json
{
  "data": {
    "linked": [42, 43],
    "auditProjectId": 5,
    "count": 2
  }
}
```

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 400 | `files.link.projectNotFound` | El proyecto no existe o no pertenece a la organización |
| 400 | `files.link.noDocumentsFound` | Ningún documento válido para vincular (ya vinculados o no existen) |

---

## Resumen del flujo por tipo de archivo

### Archivos de auditoría (evidencias, reportes, docs empresa)

1. `POST /files/upload-url` → obtener URL firmada
2. `PUT <uploadUrl>` → subir binario al storage
3. `POST /files/confirm` → confirmar y obtener `document.id`
4. Usar `document.id` en la creación de la entidad (`documentIds: [...]`) o en `POST /files/link`

### Fotos de perfil

1. `POST /files/upload-url` con `category: "profiles"` → obtener URL firmada
2. `PUT <uploadUrl>` → subir binario al storage
3. `POST /files/confirm` → obtener `document.key` y `downloadUrl`
4. Guardar `document.key` en la entidad correspondiente (ej: `POST /users/update` con `profileImage`)
