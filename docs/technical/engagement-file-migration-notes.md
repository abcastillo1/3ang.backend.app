# Migración a engagement_file — notas de ejecución

## Dummy completo (sin documentos)

- **`migrations/0029_dummy_project_complete.sql`** — proyecto con secciones anidadas, varios estados de ítem, carpeta bajo Programas. Requiere **0028** ya aplicada.
- Ver [`dummy-project-seed.md`](dummy-project-seed.md) y [`../frontend/ENGAGEMENT-FILE-FRONTEND-GUIDE.md`](../frontend/ENGAGEMENT-FILE-FRONTEND-GUIDE.md).

## Orden obligatorio

1. **Ejecutar `migrations/0028_engagement_file_rename.sql`** en la BD (tablas + `audit_tree_nodes.type` + permiso).
2. **Reiniciar la app** — los modelos Sequelize apuntan a `engagement_file_*`.

## Si la migración 0026 (dummy) aún no corrió

- Ejecutar **0026 antes de 0028** (usa `permanent_file_sections`), **o**
- Tras 0028, adaptar 0026 manualmente a nombres `engagement_file_*` y `type = 'engagement_file'`.

## Rutas API

- **Nuevas (recomendadas):**  
  `POST .../projects/engagement-file/...`  
  `POST .../organizations/engagement-file-template/...`
- **Legacy:**  
  `.../permanent-file/...` y `.../permanent-file-template/...` siguen registradas con los mismos handlers.

## Carpeta de código

Los handlers siguen en `app/projects/permanent-file/` y `app/organizations/permanent-file-template/`.  
Renombrar carpetas a `engagement-file` es opcional (solo imports en `routes/*.js`).

## Script de parche (opcional)

Si quedara algún `PermanentFile*` en JS:

```bash
node scripts/patch-engagement-models.js
```

## Permiso

- Nuevo: `projects.engagementFile.manage`
- El viejo `projects.permanentFile.manage` puede eliminarse de BD cuando ya no se use.
