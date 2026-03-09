# Guías para el Frontend

Documentación de contratos de API para integrar el frontend con el backend. Cada archivo documenta endpoints, requests, responses y reglas de negocio relevantes.

| Guía | Contenido |
|------|-----------|
| [`api-client.md`](api-client.md) | Convenciones generales: URL base, headers, formato de request/response, códigos de error, tabla completa de endpoints. |
| [`auth.md`](auth.md) | Login, logout, refresh token. Datos que retorna el login, permisos del usuario, comportamiento del owner. |
| [`file-upload.md`](file-upload.md) | Subida de archivos con URLs firmadas: flujo de 3 pasos, categorías, MIME types, vinculación con entidades. |
| [`users-roles.md`](users-roles.md) | CRUD de usuarios, roles, permisos. Campos obligatorios/opcionales, respuestas, asignación de permisos. |
| [`organizations.md`](organizations.md) | Datos de la organización, OrganizationSetting (límites y configuración). |
| [`clients.md`](clients.md) | CRUD de clientes (auditados): crear, listar, ver detalle, actualizar, eliminar. |

---

## Convenciones del API

- **Base URL:** `http://localhost:3000/api/v1`
- **Método:** Todos los endpoints usan **POST** (no GET/PUT/DELETE)
- **Body:** Siempre envuelto en `{ "data": { ... } }`
- **Auth:** Header `Authorization: Bearer <token>` (excepto login y health)
- **Respuesta exitosa:** `{ statusCode: 200, message: "...", data: { ... } }`
- **Respuesta error:** `{ statusCode: 4xx, message: "...", errorCode: "..." }`
