# Migraciones 0032–0034 — orden y notas

## Orden obligatorio

1. **0032** — `checklist_item_comments` + `audit_documents.comment_id`  
2. **0033** — `audit_documents.deleted_at` + `audit_tree_nodes.deleted_at`  
3. **0034** — `project_assignments` + `checklist_item_assignees` + drop UNIQUE  

Si **0033** corre antes que **0032**, no pasa nada grave (0033 no toca `comment_id`).  
Si **0032** corre dos veces → error por columna/índice/FK ya existente.

## Seeds / SQL con `NOT EXISTS` en `project_assignments` o `checklist_item_assignees`

Tras **0034** puede haber **varias filas** por `(project_id, user_id)` o `(item_id, user_id)` (activas + histórico soft-borrado).  
Los `INSERT ... WHERE NOT EXISTS (SELECT 1 FROM project_assignments WHERE ...)` **sin** `deleted_at IS NULL` pueden dejar de insertar si solo existe fila borrada lógico.

**Recomendación:** en seeds, usar algo como:

```sql
NOT EXISTS (
  SELECT 1 FROM project_assignments
  WHERE audit_project_id = @proj AND user_id = @user AND deleted_at IS NULL
)
```

(o re-ejecutar asignación vía API que hace restore).

## Índices 0034

Si `DROP INDEX` falla por nombre distinto en tu BD, listar con:

`SHOW INDEX FROM project_assignments;`  
`SHOW INDEX FROM checklist_item_assignees;`
