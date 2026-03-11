# API — Historial de actividad (Activity Log)

Permiso requerido: `activity.view`.

---

## POST /audit/activity/list

Lista el historial de actividad de la organización. Opcionalmente filtrado por proyecto, usuario, acción o entidad.

### Request

```json
{
  "data": {
    "page": 1,
    "limit": 20,
    "auditProjectId": null,
    "userId": null,
    "action": null,
    "entity": null
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| page | int | No (default 1) | Página |
| limit | int | No (default 20, max 100) | Registros por página |
| auditProjectId | int | No | Si se envía, solo actividad de ese proyecto. El proyecto debe ser de la organización. |
| userId | int | No | Filtrar por usuario que realizó la acción |
| action | string | No | Código de acción (ver tabla abajo) |
| entity | string | No | Entidad (ver tabla abajo) |
| locale | string | No | Idioma para las descripciones: `es`, `en`, `es-EC`, `en-US`, etc. Por defecto se usa cabecera Accept-Language o `es`. |

### Response exitosa (200)

```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "activity": [
      {
        "id": 1,
        "userId": 2,
        "userFullName": "María Castillo",
        "userEmail": "maria.castillo@3angauditores.com",
        "auditProjectId": 5,
        "action": "assignment.removed",
        "entity": "assignment",
        "entityId": 12,
        "description": "Sacó a Carlos Mendoza del equipo",
        "descriptionKey": "activity.assignment.removed",
        "metadata": {
          "projectName": "Auditoría Financiera 2025",
          "removedUserId": 3,
          "removedUserName": "Carlos Mendoza"
        },
        "createdAt": "2026-03-09T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

- **description**: Texto ya traducido e interpolado según el `locale` enviado (o Accept-Language). Listo para mostrar en la UI; el front no necesita i18n para esta cadena.
- **descriptionKey**: Clave interna (ej. `activity.assignment.removed`) por si el front la necesita (analytics, fallback).
- **action** / **entity**: Códigos estables para filtros o lógica.
- **metadata**: Datos usados para interpolar (nombres, IDs). El backend ya aplicó estos valores en `description`.

---

## Códigos de acción (action)

| Código | Entidad típica | Descripción |
|--------|----------------|-------------|
| project.created | project | Creó un proyecto |
| project.updated | project | Actualizó un proyecto |
| project.deleted | project | Eliminó un proyecto |
| assignment.added | assignment | Agregó a alguien al equipo |
| assignment.removed | assignment | Quitó a alguien del equipo |
| tree.node.created | tree_node | Creó un nodo en el árbol |
| tree.node.moved | tree_node | Movió un nodo |
| tree.node.reordered | tree_node | Reordenó nodos |
| tree.node.deleted | tree_node | Eliminó un nodo y su subárbol |
| document.uploaded | document | Subió un documento |
| document.linked | document | Vinculó documentos a un proyecto |
| document.deleted | document | Eliminó un documento |
| client.created | client | Creó un cliente |
| client.updated | client | Actualizó un cliente |
| client.deleted | client | Eliminó un cliente |
| organization.updated | organization | Actualizó datos de la organización |
| user.created | user | Creó un usuario |
| user.updated | user | Actualizó un usuario |
| role.created | role | Creó un rol |
| role.updated | role | Actualizó un rol |
| role.deleted | role | Eliminó un rol |

Todas las acciones anteriores se registran automáticamente al usar los endpoints de cada módulo. El historial es único por organización y opcionalmente filtrable por proyecto.

Las traducciones de las descripciones viven en el backend en `assets/translations/es.json` y `assets/translations/en.json` (sección `activity`). Idiomas soportados: `es`, `en`. Para cambiar un texto o añadir un idioma se edita el JSON correspondiente.

## Entidades (entity)

`project`, `assignment`, `tree_node`, `document`, `client`, `organization`, `user`, `role`.
