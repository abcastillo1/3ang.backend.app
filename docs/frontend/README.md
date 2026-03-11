# Guías para el Frontend

Documentación de contratos de API y flujos de integración para el frontend. Organizado en dos secciones:

- **`api/`** — Contratos por módulo (endpoints, requests, responses, errores)
- **`flows/`** — Flujos y comportamientos de componentes (procesos de varios pasos)

---

## API — Contratos por módulo

| Archivo | Contenido |
|---------|-----------|
| [`api/auth.md`](api/auth.md) | Login, logout, refresh token. Datos que retorna el login, permisos del usuario, comportamiento del owner. |
| [`api/users-roles.md`](api/users-roles.md) | CRUD de usuarios, roles, permisos. Campos obligatorios/opcionales, respuestas, asignación de permisos. |
| [`api/organizations.md`](api/organizations.md) | Datos de la organización, OrganizationSetting (límites y configuración). |
| [`api/clients.md`](api/clients.md) | CRUD de clientes (auditados): crear, listar, ver detalle, actualizar, eliminar. |
| [`api/projects.md`](api/projects.md) | Proyectos de auditoría: CRUD, transición de estados, asignación de equipo (partner/manager/member). |
| [`api/files.md`](api/files.md) | Endpoints de archivos: listar, eliminar, vincular a proyectos, obtener URL de descarga. |
| [`api/tree.md`](api/tree.md) | Árbol del proyecto: crear nodos, listar hijos, breadcrumb, mover, reordenar, eliminar. |

## Flujos y comportamientos

| Archivo | Contenido |
|---------|-----------|
| [`flows/file-upload.md`](flows/file-upload.md) | Subida de archivos con URLs firmadas: flujo de 3 pasos, categorías, MIME types, vinculación con entidades. |
| [`flows/permanent-file-ui.md`](flows/permanent-file-ui.md) | Archivo permanente: árbol + node-detail, carpetas/ítems/documentos/encargado, qué llamar desde el panel central. |

---

## Referencia general

| Archivo | Contenido |
|---------|-----------|
| [`api/_overview.md`](api/_overview.md) | Convenciones generales: URL base, headers, formato de request/response, códigos de error, tabla completa de endpoints. |

---

## Convenciones del API

- **Base URL:** `http://localhost:3000/api/v1`
- **Método:** Todos los endpoints usan **POST** (no GET/PUT/DELETE)
- **Body:** Siempre envuelto en `{ "data": { ... } }`
- **Auth:** Header `Authorization: Bearer <token>` (excepto login y health)
- **Respuesta exitosa:** `{ statusCode: 200, message: "...", data: { ... } }`
- **Respuesta error:** `{ statusCode: 4xx, message: "...", errorCode: "..." }`
