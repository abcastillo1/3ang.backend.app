# Guías para el Frontend

Documentación práctica para integrar el frontend (React) con el backend. Cada archivo cubre un tema con ejemplos de código listos para usar.

| Guía | Contenido |
|------|-----------|
| [`api-client.md`](api-client.md) | Configuración base: URL, headers, formato de request/response, manejo de errores, token JWT. Incluye un cliente API reutilizable. |
| [`auth.md`](auth.md) | Login, logout, refresh token, manejo de sesión, protección de rutas. |
| [`file-upload.md`](file-upload.md) | Subida de archivos con URLs firmadas: componente de upload, barra de progreso, vinculación con entidades. |
| [`users-roles.md`](users-roles.md) | CRUD de usuarios, roles, permisos. Verificación de permisos en el frontend. |
| [`organizations.md`](organizations.md) | Datos de la organización, settings (OrganizationSetting). |

---

## Convenciones del API

- **Base URL:** `http://localhost:3000/api/v1`
- **Método:** Todos los endpoints usan **POST** (no GET/PUT/DELETE)
- **Body:** Siempre envuelto en `{ "data": { ... } }`
- **Auth:** Header `Authorization: Bearer <token>` (excepto login)
- **Respuesta exitosa:** `{ statusCode: 200, message: "...", data: { ... } }`
- **Respuesta error:** `{ statusCode: 4xx, message: "...", errorCode: "..." }`
