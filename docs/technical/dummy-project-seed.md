# Proyecto dummy para pruebas

## Migración `0026_seed_dummy_audit_project.sql`

Crea en base:

| Qué | Detalle |
|-----|--------|
| **Cliente** | `Empresa Dummy S.A.` (RUC `1999999999001`) |
| **Proyecto** | `Proyecto Dummy - Prueba plataforma` (estado `in_progress`) |
| **Árbol** | 5 raíces + carpeta **folder** `DUMMY-A` enlazada a `permanent_file_sections` |
| **Ítems** | `DUMMY-A1` (pending, con 1–2 asignados) y `DUMMY-A2` (in_review, sin asignados) |
| **Asignados** | Tabla `checklist_item_assignees` en A1; `created_by_user_id` = usuario 1 |
| **Extra** | Carpeta bajo Programas para probar `tree/create` manual |

## Requisitos

- `0015` (usuarios/org) ya ejecutado.
- `0023` (tree_node_id en sections/items).
- `0025` (checklist_item_assignees + created_by_user_id).

Si `0024` no está aplicado, el seed no usa `description` en sections (ya omitido).

## Cómo probar

1. Ejecutar el SQL en MySQL (o correr migraciones si integran el archivo).
2. Login con usuario de la org 1.
3. `POST /projects/list` → localizar **Proyecto Dummy**.
4. `POST /projects/tree/full` con `data.auditProjectId` = id del proyecto.
5. Expandir **Archivo Permanente** → **DUMMY-A — Sección prueba** → ítems.
6. `POST /projects/tree/node-detail` con `nodeId` del nodo de **DUMMY-A1** → debe devolver `detailType: checklist_item`, `assignees`, `createdBy`.
7. Subir archivo con `files/upload-url` + `confirm` usando `nodeId` del ítem.

## Idempotencia

- Cliente/proyecto: no duplica si ya existen (por RUC / nombre).
- Raíces: solo se insertan si el proyecto no tenía nodos.
- Sección/ítems: no duplican si ya existen códigos `DUMMY-A` / `DUMMY-A1` / `DUMMY-A2`.

Para **resetear** el dummy, borrar manualmente el proyecto (CASCADE limpia árbol y secciones) y volver a ejecutar el script.
