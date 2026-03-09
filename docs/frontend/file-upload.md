# Subida de Archivos — Guía Frontend

La subida de archivos usa **URLs firmadas** (presigned URLs). El archivo va directo del navegador al storage (Backblaze B2), sin pasar por el backend. El proceso tiene 3 pasos obligatorios + 1 opcional.

---

## Flujo completo

```
┌────────────┐    PASO 1     ┌─────────┐
│  Frontend  │──────────────>│ Backend │  POST /files/upload-url
│            │<──────────────│         │  ← { uploadUrl, key, expiresIn }
│            │               └─────────┘
│            │    PASO 2     ┌──────────────┐
│            │──────────────>│ Backblaze B2 │  PUT uploadUrl (binary)
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

```javascript
const step1 = await api.post('/files/upload-url', {
  name: file.name,                // "balance_2024.pdf"
  mimeType: file.type,            // "application/pdf"
  size: file.size,                // 2048000
  category: 'audit_evidences'     // ver categorías abajo
});

// step1 retorna:
// {
//   uploadUrl: "https://s3.us-west-004.backblazeb2.com/...",
//   key: "1/audit_evidences/general/uuid.pdf",
//   expiresIn: 300,
//   contentType: "application/pdf"
// }
```

### Categorías permitidas

| Categoría | Uso | Crea registro en BD |
|-----------|-----|---------------------|
| `audit_evidences` | Evidencias de auditoría | Sí → `audit_documents` |
| `fiscal_reports` | Reportes fiscales | Sí → `audit_documents` |
| `company_docs` | Documentos de la empresa | Sí → `audit_documents` |
| `profiles` | Fotos de perfil de usuarios/clientes | No (solo retorna key + URL) |

### MIME types permitidos

- `application/pdf`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx)
- `application/vnd.ms-excel` (xls)
- `image/jpeg`
- `image/png`
- `image/webp`

### Tamaño máximo: **40 MB**

---

## Paso 2 — Subir archivo directo a B2

```javascript
const uploadResponse = await fetch(step1.uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': step1.contentType
  },
  body: file  // el File object directo
});

if (!uploadResponse.ok) {
  throw new Error('Error al subir archivo');
}
```

### Con barra de progreso (XMLHttpRequest)

```javascript
function uploadWithProgress(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.send(file);
  });
}

// Uso:
await uploadWithProgress(step1.uploadUrl, file, step1.contentType, (percent) => {
  setProgress(percent);  // actualizar state de React
});
```

---

## Paso 3 — Confirmar subida

```javascript
const step3 = await api.post('/files/confirm', {
  key: step1.key,
  originalName: file.name,
  mimeType: file.type,
  size: file.size,
  category: 'audit_evidences',
  auditProjectId: 5,   // opcional: vincular al proyecto ya
  nodeId: 12            // opcional: vincular al nodo del árbol
});
```

### Respuesta para categoría de auditoría (audit_evidences, fiscal_reports, company_docs)

```json
{
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
```

**`document.id` es lo más importante** — se usa para vincular el documento a entidades.

### Respuesta para categoría `profiles`

```json
{
  "document": {
    "key": "1/profiles/general/uuid.jpg",
    "originalName": "avatar.jpg",
    "mimeType": "image/jpeg",
    "size": 150000,
    "category": "profiles",
    "downloadUrl": "https://s3.../signed-url..."
  }
}
```

No crea registro en BD. El `key` se guarda directamente en el campo correspondiente del usuario o cliente.

---

## Paso 4 — Vincular documentos a entidades

### Opción A: Al crear la entidad (recomendado)

```javascript
// Subir documentos primero, recolectar sus IDs
const docIds = [42, 43, 44];

// Crear proyecto con documentos vinculados en una sola llamada
await api.post('/projects/create', {
  name: 'Auditoría 2024',
  clientId: 1,
  auditType: 'financial',
  periodStart: '2024-01-01',
  periodEnd: '2024-12-31',
  documentIds: docIds  // se vinculan automáticamente
});
```

### Opción B: Vincular a entidad existente

```javascript
await api.post('/files/link', {
  documentIds: [42, 43],
  auditProjectId: 5,
  nodeId: 12  // opcional
});

// Respuesta:
// { linked: [42, 43], auditProjectId: 5, count: 2 }
```

---

## Componente de Upload completo (React)

```jsx
// src/components/FileUpload.jsx
import { useState, useRef } from 'react';
import { api } from '../services/api';

const ACCEPT_MAP = {
  audit_evidences: '.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp',
  profiles: '.jpg,.jpeg,.png,.webp'
};

export function FileUpload({ category = 'audit_evidences', onUploaded, multiple = false }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function uploadFile(file) {
    const entry = { name: file.name, progress: 0, status: 'uploading', id: null };
    setFiles(prev => [...prev, entry]);

    const updateEntry = (updates) => {
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, ...updates } : f));
    };

    try {
      // Paso 1
      const { uploadUrl, key, contentType } = await api.post('/files/upload-url', {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        category
      });

      // Paso 2
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) updateEntry({ progress: Math.round((e.loaded / e.total) * 100) });
        };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });

      // Paso 3
      const { document } = await api.post('/files/confirm', {
        key,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        category
      });

      updateEntry({ progress: 100, status: 'done', id: document.id || null, document });

      if (onUploaded) onUploaded(document);
    } catch (err) {
      updateEntry({ status: 'error', error: err.message });
    }
  }

  async function handleChange(e) {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;

    setUploading(true);
    await Promise.all(selected.map(uploadFile));
    setUploading(false);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MAP[category] || '*'}
        multiple={multiple}
        onChange={handleChange}
        hidden
      />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Subiendo...' : 'Seleccionar archivos'}
      </button>

      <ul>
        {files.map((f, i) => (
          <li key={i}>
            {f.name}
            {f.status === 'uploading' && <span> — {f.progress}%</span>}
            {f.status === 'done' && <span> ✓</span>}
            {f.status === 'error' && <span> ✗ {f.error}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Uso del componente

```jsx
function ProjectDocuments() {
  const [docIds, setDocIds] = useState([]);

  return (
    <FileUpload
      category="audit_evidences"
      multiple
      onUploaded={(doc) => {
        setDocIds(prev => [...prev, doc.id]);
      }}
    />
    // Luego usar docIds al crear el proyecto
  );
}
```

---

## Fotos de perfil

Para fotos de perfil el flujo es más simple porque no crea registro en BD:

```javascript
async function uploadProfilePhoto(file) {
  const { uploadUrl, key, contentType } = await api.post('/files/upload-url', {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    category: 'profiles'
  });

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file
  });

  const { document } = await api.post('/files/confirm', {
    key,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    category: 'profiles'
  });

  // Guardar el key en el perfil del usuario
  await api.post('/users/update', {
    id: userId,
    profileImage: document.key
  });

  return document.downloadUrl;  // para mostrar la imagen de inmediato
}
```
