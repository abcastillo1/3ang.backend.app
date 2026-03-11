# Mapa: árbol + expediente estructurado (antes / después del centralizar)

Referencia visual de **qué se renombra** y **qué no se toca**, y cómo encaja todo con `audit_tree_nodes` y `audit_documents`.

**Convención en los diagramas**

- 🔴 **Cambia nombre** (tabla, ruta API o permiso)
- 🟢 **Sin cambio de nombre** (sigue igual; solo actualizar FKs/imports si aplica)
- 🔵 **Flujo / contenedor**

---

## 1. Vista de capas (qué es qué)

```mermaid
flowchart TB
  subgraph org["Organización"]
    TSEC["🔴 permanent_file_template_sections\n→ engagement_file_template_sections"]
    TITEM["🔴 permanent_file_template_items\n→ engagement_file_template_items"]
    TSEC --> TITEM
  end

  subgraph project["Proyecto audit_projects"]
    ROOT["🟢 audit_tree_nodes\ntype=permanent_file (raíz)"]
    SEC["🔴 permanent_file_sections\n→ engagement_file_sections"]
    ITEMS["🟢 checklist_items"]
    DOCS["🟢 audit_documents"]
    ROOT --> SEC
    SEC --> ITEMS
    ITEMS -.->|tree_node_id| NITEM["🟢 audit_tree_nodes\ntype=checklist_item"]
    SEC -.->|tree_node_id| NFOLDER["🟢 audit_tree_nodes\ntype=folder"]
    DOCS -->|node_id| NITEM
    DOCS -->|node_id| NFOLDER
  end

  org -->|"apply-template copia"| SEC
  org -->|"apply-template copia"| ITEMS
```

---

## 2. Árbol (`audit_tree_nodes`) — qué nodos existen y qué apuntan

```mermaid
flowchart TB
  P["audit_projects"]
  R["audit_tree_nodes\ntype = permanent_file\n(raíz expediente)"]
  F["audit_tree_nodes\ntype = folder\nrefId → engagement_file_sections.id"]
  C["audit_tree_nodes\ntype = checklist_item\nrefId → checklist_items.id"]

  P --> R
  R --> F
  F --> C

  S["🔴 permanent_file_sections\n→ engagement_file_sections\ntree_node_id ↔ nodo folder"]
  I["🟢 checklist_items\ntree_node_id ↔ nodo checklist_item"]

  F <--> S
  C <--> I

  D["🟢 audit_documents\nnode_id → cualquier nodo"]
  D --> F
  D --> C
```

**Nota:** El **type** del nodo raíz puede seguir llamándose `permanent_file` en BD (semántica “archivo permanente como área”) o unificarse a `engagement_file` en una migración de datos; el mapa lógico no cambia.

---

## 3. Tablas: antes → después (solo renombrado)

```mermaid
flowchart LR
  subgraph antes["ANTES (prefijo permanent_file)"]
    A1[permanent_file_sections]
    A2[permanent_file_template_sections]
    A3[permanent_file_template_items]
  end

  subgraph despues["DESPUÉS (prefijo engagement_file — ejemplo)"]
    B1[engagement_file_sections]
    B2[engagement_file_template_sections]
    B3[engagement_file_template_items]
  end

  A1 -->|RENAME| B1
  A2 -->|RENAME| B2
  A3 -->|RENAME| B3
```

**Sin renombrar (siguen iguales):**

| Tabla | Rol |
|-------|-----|
| `audit_tree_nodes` | Jerarquía única por proyecto |
| `checklist_items` | Ítems/tareas; `section_id` → tabla renombrada |
| `checklist_item_assignees` | Asignados por ítem |
| `audit_documents` | Archivos; `node_id` → nodo |

---

## 4. API: rutas antes → después

```mermaid
flowchart LR
  subgraph api_antes["Rutas actuales"]
    P1["POST .../permanent-file/sections/*"]
    P2["POST .../permanent-file/items/*"]
    P3["POST .../permanent-file/apply-template"]
    O1["POST .../permanent-file-template/sections/*"]
    O2["POST .../permanent-file-template/items/*"]
  end

  subgraph api_despues["Rutas centralizadas (ejemplo)"]
    Q1["POST .../engagement-file/sections/*"]
    Q2["POST .../engagement-file/items/*"]
    Q3["POST .../engagement-file/apply-template"]
    R1["POST .../engagement-file-template/sections/*"]
    R2["POST .../engagement-file-template/items/*"]
  end

  P1 -.->|mismo handler| Q1
  P2 -.->|mismo handler| Q2
  P3 -.->|mismo handler| Q3
  O1 -.->|mismo handler| R1
  O2 -.->|mismo handler| R2
```

Opcional: registrar **ambas** rutas un tiempo (alias deprecado).

---

## 5. Permisos

```mermaid
flowchart LR
  A["projects.permanentFile.manage\n🔴 deprecar / migrar"]
  B["projects.engagementFile.manage\n🔴 nuevo código"]
  A --> B
```

Misma asignación a roles; cambia el `code` en `permissions` (+ `role_permissions`).

---

## 6. Código: carpetas y archivos que se mueven/renombran

```text
app/projects/permanent-file/          →  app/projects/engagement-file/
app/organizations/permanent-file-template/  →  app/organizations/engagement-file-template/

models/audit/permanentFileSection.js           →  models/audit/engagementFileSection.js
models/organizations/permanentFileTemplateSection.js  →  .../engagementFileTemplateSection.js
models/organizations/permanentFileTemplateItem.js     →  .../engagementFileTemplateItem.js

helpers/permanent-file-tree-sync.js   →  helpers/engagement-file-tree-sync.js
helpers/permanent-file-template.js    →  helpers/engagement-file-template.js
```

**Árbol (sin mover de carpeta, solo imports):**

- `app/projects/tree/full`
- `app/projects/tree/node-detail`
- `app/projects/tree/create|move|delete|...`

Siguen igual; por dentro pasan a usar los modelos/helpers con nombre nuevo.

---

## 7. Resumen en una imagen mental

```text
                    ORGANIZACIÓN
                         │
         ┌───────────────┴───────────────┐
         │  PLANTILLA (molde)            │
         │  template_sections            │
         │       └── template_items      │
         └───────────────┬───────────────┘
                         │ apply-template
                         ▼
                    PROYECTO
                         │
         ┌───────────────┴───────────────┐
         │  INSTANCIA                     │
         │  engagement_file_sections      │
         │       └── checklist_items      │
         └───────────────┬───────────────┘
                         │ sync
                         ▼
              audit_tree_nodes (único árbol)
                         │
              ┌──────────┴──────────┐
              │ folder   checklist_item │
              └──────────┬──────────┘
                         │
              audit_documents.node_id
              (N docs por nodo)
```

---

## 8. Dónde sigue el detalle paso a paso

- Hoja de ruta con fases y checklists: [`roadmap-centralizar-expediente.md`](roadmap-centralizar-expediente.md)
- Índice general: [`../README.md`](../README.md)

Cuando elijas el prefijo final (`engagement_file` u otro), sustituí en este doc los nombres de ejemplo.
