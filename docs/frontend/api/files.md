# Archivos — Contratos de API

Endpoints para gestionar documentos: listar, eliminar, vincular, obtener URLs de descarga. Para el flujo completo de subida de archivos, ver `../flows/file-upload.md`.

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
