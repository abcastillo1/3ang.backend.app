# Proyecto dummy para pruebas (completo, sin documentos)

## Recomendado: `0029_dummy_project_complete.sql`

Ejecutar **después de `0028`** (tablas `engagement_file_*` y nodos `type = engagement_file`).

| Qué | Detalle |
|-----|--------|
| **Cliente** | `Empresa Dummy S.A.` (RUC `1999999999001`) |
| **Proyecto** | `Proyecto Dummy - Prueba plataforma` |
| **Árbol** | 5 raíces; primera `engagement_file` (fallback `permanent_file` si BD vieja) |
| **DUMMY-A** | Sección raíz + **subsección DUMMY-A1** (anidada) |
| **Ítems en A1** | `A1.1` pending + asignado; `A1.2` in_review; `A1.3` not_applicable |
| **DUMMY-B** | Sección hermana con ítem `B.1` compliant |
| **Programas** | Carpeta manual `101 — Bancos` bajo nodo `programs` (`refId` null) |
| **Documentos** | **No** — omitidos a propósito para aislar lógica de carpetas/ítems |

### Requisitos 0029

- `0028` aplicada (o las tablas deben llamarse `engagement_file_sections` / template_*).
- `0023`, `0025`.

### Cómo probar (front)

1. `POST /projects/list` → id del proyecto dummy.
2. `POST /projects/tree/full` → construir sidebar.
3. Navegar: Archivo Permanente → DUMMY-A → DUMMY-A1 → ver 3 ítems.
4. `POST /projects/tree/node-detail` con `nodeId` de un ítem → `detailType: checklist_item`.
5. `POST /projects/engagement-file/items/list` con `sectionId` de DUMMY-A1.

Guía granular UI: [`../frontend/ENGAGEMENT-FILE-FRONTEND-GUIDE.md`](../frontend/ENGAGEMENT-FILE-FRONTEND-GUIDE.md).

---

## Legacy: `0026_seed_dummy_audit_project.sql`

Solo si la BD **aún no** tiene `0028` (tablas `permanent_file_*` y `type = permanent_file`).

Crea: 5 raíces, sección DUMMY-A (sin subcarpeta), ítems DUMMY-A1/A2, carpeta bajo Programas.

---

## Idempotencia

- No duplica cliente/proyecto por RUC/nombre.
- Raíces solo si el proyecto no tenía nodos.
- Secciones/ítems por código único por proyecto.

## Ampliación: `0030_dummy_mixed_children_and_collaborators.sql`

**Después de 0029.** Añade:

| Qué | Para qué sirve en el front |
|-----|----------------------------|
| **Hijos mixtos bajo DUMMY-A** | Bajo el mismo nodo carpeta conviven subcarpetas (DUMMY-A2) e **ítems** (A.1, A.2) como hermanos — demuestra `type` folder + checklist_item al mismo nivel. |
| **A2.1** | Ítem solo bajo subcarpeta A2. |
| **A.2 con 3 asignados** | Probar lista `assignees[]` en `node-detail` (varios colaboradores en un ítem). |
| **project_assignments** | Auditor y tercer usuario como `member` — listar con `assignments/list`. |
| **Programas** | Carpetas genéricas 102 CxC y 103 Inventarios hermanas de 101 Bancos. |

**Rendimiento:** no meter assignees en `tree/full`; cargar colaboradores del proyecto una vez con `assignments/list`; asignados por ítem en `node-detail` bajo demanda.

## Sobre tu árbol actual (nodos 1–17, proyecto 1)

Si ya tenés el árbol como en `tree/full` con **nodo 8 = DUMMY-A**, **9 = A1**, **10–12** ítems, **16–17** bajo 10, etc., usá **`0031_dummy_on_tree_project_1.sql`**: fija `audit_project_id = 1` y `parent_id = 8` para ítems/carpetas hermanas sin recalcular ids. No reemplaza 0030; es alternativa cuando los ids ya son los de tu respuesta JSON.

Para resetear: borrar el proyecto (CASCADE) y volver a ejecutar el script elegido.
