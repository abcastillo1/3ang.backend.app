# Archivos — Contratos de API

Endpoints para gestionar documentos: listar, eliminar, vincular, obtener URLs de descarga. Detalle técnico adicional: `../../technical/file-upload.md`. Guía de flujo UX: `../flows/file-upload.md`.

---

## Flujo de subida (backend — directo al bucket)

El servidor **no recibe el archivo binario**. El cliente:

1. Pide una URL prefirmada de **PUT** → `POST /api/v1/files/upload-url`
2. Sube el archivo con **PUT** a `uploadUrl` (Backblaze B2 / S3-compatible), con `Content-Type` igual al `mimeType` / `contentType` acordado en el paso 1
3. Según la **categoría**:
   - **Documentos de auditoría** (`audit_evidences`, `fiscal_reports`, `company_docs`): registra en BD → `POST /api/v1/files/confirm`
   - **Perfiles / logos** (`profiles`): **no** se llama `confirm`; se guarda el `key` en la entidad (usuario, organización, etc.) y para mostrar la imagen se usa `POST /api/v1/files/download-url`

**Permisos**

| Endpoint | Permiso |
|----------|---------|
| `upload-url`, `confirm`, `link`, `list`, `delete` | `files.upload` |
| `download-url` | Solo autenticación (el `key` debe empezar por `{organizationId}/`) |

### 1) Obtener URL de subida

```
POST /api/v1/files/upload-url
Authorization: Bearer <token>
Requiere permiso: files.upload
```

**Body `data`:**

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `name` | Sí | Nombre original (solo influye en la extensión del objeto generado en el servidor) |
| `mimeType` | Sí | Debe ser uno de: `application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `image/jpeg`, `image/png`, `image/webp` |
| `size` | Sí | Bytes, entre 1 y 40 MB |
| `category` | Sí | `audit_evidences` \| `fiscal_reports` \| `company_docs` \| `profiles` |
| `auditCaseId` | No | Si se envía, el path del objeto incluye ese segmento; si no, `general` |

**Response `data`:** `uploadUrl`, `key`, `expiresIn`, `contentType` (debe coincidir con el header `Content-Type` del PUT).

### 2) PUT al bucket

- Método: `PUT`
- URL: `uploadUrl` (caduca en `expiresIn`, típ. 300 s)
- Body: bytes del archivo
- Header: `Content-Type: <contentType de la respuesta de upload-url>`

Si el PUT no devuelve éxito (2xx), **no** llamar a `confirm`.

#### PUT desde el navegador (CORS + body)

- El **`body` del `fetch` debe ser el archivo** (`File` / `Blob`); sin body el PUT falla o queda vacío.
- Solo hace falta el header **`Content-Type`** igual a `contentType` del paso 1 (no añadas headers extra salvo que la URL los exija).
- **CORS en Backblaze B2:** el bucket debe tener reglas CORS que permitan:
  - **Origen** de tu app (ej. `http://localhost:3000` en desarrollo).
  - Método **`PUT`** y header **`Content-Type`** (y `Authorization` si aplica).
  Si el navegador muestra “failed to fetch” / TypeError sin respuesta, casi siempre es **CORS** o URL expirada. La UI de B2 a veces no basta: ver **[Troubleshooting CORS B2](#troubleshooting-cors-b2-s3-put)** (regla con `s3_put` + `content-type` vía CLI).

### 3a) Documentos de auditoría — confirmar y crear `audit_documents`

```
POST /api/v1/files/confirm
Authorization: Bearer <token>
Requiere permiso: files.upload
```

**Body `data`:** `key`, `originalName`, `mimeType`, `size`, `category` (solo las tres categorías de auditoría; **no** `profiles`).

Opcionales:

| Campo | Uso |
|-------|-----|
| `auditProjectId` o `auditCaseId` | Mismo valor de proyecto (alias); si no hay proyecto aún, se puede omitir y el doc queda sin proyecto hasta `files/link` |
| `nodeId` | Nodo del árbol del proyecto |
| `commentId` | Adjunto a comentario; si se envía, **obligatorio** `auditProjectId` (o `auditCaseId`); valida comentario + ítem + `nodeId` |

**Response `data`:** `document` con `id`, `key`, `downloadUrl` (GET prefirmada temporal), `analysisStatus`, etc.

### 3b) Perfiles / logos (`profiles`) — sin `confirm`

- Tras el PUT exitoso, persistir en la entidad el **`key`** devuelto por `upload-url` (ej. campo imagen del usuario u organización).
- Para **mostrar** la imagen: `POST /api/v1/files/download-url` con `data.key`.

### 4) Documentos huérfanos → proyecto existente

Si subiste con `confirm` **sin** `auditProjectId`, luego:

```
POST /api/v1/files/link
```

Con `documentIds`, `auditProjectId`, y opcionalmente `nodeId` y `commentId` (mismas reglas que en confirm para comentarios).

---

<a id="troubleshooting-cors-b2-s3-put"></a>

## Troubleshooting: CORS en B2 (PUT al endpoint S3 desde el navegador)

Si el `fetch` al `uploadUrl` falla con **“Failed to fetch”**, **Provisional headers** en DevTools o error de **CORS** en consola, suele ser porque la regla CORS del bucket **no incluye la operación S3 de subida** ni el header que el navegador pide en el preflight.

La UI web de B2 (“compartir con un origen”) **no siempre** genera una regla equivalente a lo que exige la **API compatible con S3** para `PutObject`. En la [documentación de CORS de B2](https://www.backblaze.com/b2/docs/cors_rules.html), si `allowedHeaders` está vacío, el preflight que envía `Access-Control-Request-Headers: content-type` **no coincide** y el navegador bloquea la petición.

### Regla recomendada (CLI oficial B2)

Referencia: ejemplo [`b2-browser-upload`](https://github.com/backblaze-b2-samples/b2-browser-upload) de Backblaze: operaciones **`s3_put`** / **`s3_get`** y header **`content-type`** en `allowedHeaders`.

1. Instalar [B2 CLI](https://www.backblaze.com/b2/docs/quick_command_line.html) y ejecutar `b2 authorize-account`.
2. Crear un archivo JSON, por ejemplo `cors-local.json`:

```json
[
  {
    "corsRuleName": "localDevS3Put",
    "allowedOrigins": ["http://localhost:3000"],
    "allowedHeaders": ["content-type"],
    "allowedOperations": ["s3_put", "s3_get"],
    "exposeHeaders": [],
    "maxAgeSeconds": 3600
  }
]
```

- Ajustá **`allowedOrigins`** a tu origen real (mismo esquema, host y puerto que la barra del navegador). Si usás `127.0.0.1` en lugar de `localhost`, añadí otro string en el array o una segunda regla.
- Para producción, sustituí o añadí el origen HTTPS de tu app.

3. Aplicar la regla al bucket (reemplazá `NOMBRE_BUCKET` y `allPrivate`/`allPublic` según tu bucket):

**Linux / macOS (bash):**

```bash
b2 update-bucket --cors-rules "$(cat cors-local.json)" NOMBRE_BUCKET allPrivate
```

**Windows (PowerShell):** pasar JSON largo a `b2.exe` desde PowerShell a veces **elimina las comillas** del argumento y B2 responde “not a valid JSON value”. Opciones que sí funcionan:

- Desde la raíz del repo backend: **`npm run b2:cors`** (usa `node scripts/apply-b2-cors.mjs` con el JSON en `scripts/b2-cors-proyecto3ang.json`), o **`.\scripts\apply-b2-cors.ps1`**.
- O **Git Bash / WSL:** `b2 update-bucket --cors-rules "$(cat cors-local.json)" NOMBRE_BUCKET allPrivate`

4. Los cambios pueden tardar **unos minutos** en aplicarse (B2 indica ~10 min en la consola web).

5. Verificá que el PUT lleve **`body: file`** (File/Blob) y **`Content-Type`** igual al `contentType` devuelto por `upload-url`.

---

## Listar documentos

```
POST /api/v1/files/list
Authorization: Bearer <token>
Requiere permiso: files.upload
```

### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "category": "audit_evidences",
    "nodeId": 12,
    "page": 1,
    "limit": 20
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | No | Filtrar por proyecto |
| `category` | string | No | Filtrar por categoría |
| `nodeId` | int | No | Filtrar por nodo del árbol |
| `page` | int | No | Página (default 1) |
| `limit` | int | No | Registros por página (default 20, max 100) |

### Response (200)

```json
{
  "data": {
    "documents": [
      {
        "id": 42,
        "key": "1/audit_evidences/general/uuid.pdf",
        "originalName": "balance_2024.pdf",
        "mimeType": "application/pdf",
        "size": 2048000,
        "category": "audit_evidences",
        "auditProjectId": 5,
        "nodeId": null,
        "analysisStatus": "pending",
        "uploader": { "id": 1, "fullName": "Admin User" },
        "downloadUrl": "https://s3.../signed-url...",
        "createdAt": "2026-03-02T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

Cada documento incluye una `downloadUrl` firmada temporal.

---

## Obtener URL de descarga

```
POST /api/v1/files/download-url
Authorization: Bearer <token>
```

### Request

```json
{
  "data": {
    "key": "1/profiles/general/uuid.jpg"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `key` | string | Sí | Storage key del archivo. Debe pertenecer a la organización del usuario. |

### Response (200)

```json
{
  "data": {
    "downloadUrl": "https://s3.../signed-url...",
    "expiresIn": 3600
  }
}
```

Sirve para: mostrar imágenes de perfil, regenerar URLs expiradas de cualquier archivo.

---

## Vincular documentos a un proyecto existente

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
| 400 | `files.link.noDocumentsFound` | Ningún documento válido para vincular |

---

## Eliminar documento

```
POST /api/v1/files/delete
Authorization: Bearer <token>
Requiere permiso: files.upload
```

### Request

```json
{
  "data": {
    "id": 42
  }
}
```

### Response (200)

```json
{
  "data": {
    "deleted": 42
  }
}
```

Elimina el archivo del storage (B2) y el registro de la base de datos.

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `files.delete.notFound` | Documento no encontrado o no pertenece a la organización |
