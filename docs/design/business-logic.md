# Lógica de Negocio y Reglas del Dominio

Este documento describe la lógica de negocio, reglas de dominio y flujos de trabajo del sistema. Esta es la fuente de verdad para entender cómo opera el negocio.

**IMPORTANTE:** Antes de implementar nuevas funcionalidades o modificar las existentes, siempre consulta este documento para asegurar el cumplimiento de las reglas de negocio.

## Visión General del Sistema

Este es un sistema multi-tenant diseñado para organizaciones (firmas auditoras) para gestionar usuarios, roles y el flujo de auditoría.

**Documentos de contexto del proceso real:** Lo que el cliente hace hoy para manejar una auditoría está resumido en **domain/fases-auditoria-general.md** y detallado en **domain/fases-auditoria-especifico.md**. La traducción en **secciones del proyecto**, **programas por área** y **asignaciones** está en **design/audit-project-structure-and-assignments.md**. En **design/platform-flows.md** se definen: (1) que **toda** la carga de documentos sea por **URL directa** a B2/S3 (el API no lee el archivo); (2) la **IA** como **extra opcional** (el flujo principal funciona sin IA); (3) la **jerarquía tipo árbol** (carpetas/bloques) con estructura fácil de consulta; (4) la **réplica de proyecto** (copia a nuevo año y qué se reutiliza). Consultar esos documentos para alinear funcionalidades con el proceso real y con estos flujos.

---

## Flujo completo de una empresa auditora (ejemplos y lógica para escalar)

La plataforma debe cubrir **todo el flujo** que una firma de auditoría ejecuta en la vida real. A continuación: un ejemplo concreto paso a paso y, después, la lógica y entidades necesarias para implementarlo y escalarlo.

### Ejemplo real: de la aceptación del encargo al informe firmado

**Contexto:** La firma "Auditores Ecuador SA" (organización en la plataforma) tiene un cliente "Comercial La Guayaquilita SA" y debe emitir un informe de auditoría de estados financieros al cierre del ejercicio 2024.

| Paso | Qué hace la firma en el mundo real | Qué hace la plataforma (lógica a construir) | Dónde intervienen settings / plantillas / IA |
|------|------------------------------------|---------------------------------------------|---------------------------------------------|
| 1. Aceptación del encargo | La firma acepta el trabajo: cliente, tipo de auditoría (financiera), período, equipo. | Crear **proyecto/encargo de auditoría** (audit project o engagement): cliente, tipo, período, auditores asignados. | Validar que el **tipo** esté en `allowed_audit_types`. Validar que no se supere `max_audit_projects`. Pre-seleccionar plantilla según `report_template_id`. |
| 2. Planificación | Plan de auditoría: riesgos, alcance, programas. | Registrar **plan**: fechas, áreas, riesgos identificados, procedimientos planificados. Opcional: IA sugiere riesgos o procedimientos según sector/NIIF. | `default_niif_version` para etiquetar marco aplicable. |
| 3. Obtención de evidencia | El cliente sube balances, conciliaciones, contratos, etc. | El **cliente o el auditor** sube archivos (Excel, PDF) al proyecto. Se almacenan en B2; se asocian al proyecto y, si aplica, a un área/aseveración. | Categoría de almacenamiento: `audit_evidences` (path con `auditCaseId` = id del proyecto). |
| 4. Análisis de evidencia | El auditor revisa la evidencia y detecta hallazgos. | **IA** analiza los documentos subidos (Claude): extrae cifras, identifica inconsistencias o riesgos según NIIF/normativa. Se crean **hallazgos** (findings): descripción, tipo, severidad, evidencia vinculada. | Plantilla no aplica aquí; IA usa el contenido de los archivos y el contexto del proyecto (NIIF, tipo de auditoría). |
| 5. Papeles de trabajo | El auditor documenta qué revisó y qué concluyó. | Registrar **papeles de trabajo** (working papers): descripción, conclusión, referencias a evidencia y hallazgos. Opcional: IA sugiere redacción o checklist según NIA. | `default_niif_version` para clasificar. |
| 6. Borrador del informe | Se redacta el informe (alcance, opinión, párrafos de énfasis, etc.). | El usuario elige la **plantilla** (o se usa la por defecto). La plataforma muestra las secciones; la **IA** puede proponer o rellenar párrafos (alcance, hallazgos, opinión) a partir de evidencia y hallazgos. Se guarda un **borrador** (report draft) por proyecto. | `report_template_id` = plantilla por defecto. Estructura de la plantilla + datos del proyecto + salida de IA = borrador. |
| 7. Revisión y ajustes | Revisor y socio revisan; se corrigen observaciones. | Flujo de **revisión** (comentarios, versiones del borrador). Permisos: quien puede editar, quien puede aprobar. | Retención: `document_retention_years` para no borrar versiones antes de tiempo. |
| 8. Firma y emisión | Se firma el informe (electrónica o manual) y se entrega al cliente. | Registrar **firma** (fecha, firmante, tipo). Generar **documento final** (PDF) a partir del borrador aprobado + plantilla. Descarga o envío al cliente. | Datos de firma en **Organization** (signaturePath, etc.). El PDF generado es el "documento final" del informe. |
| 9. Cierre y archivo | Se archiva el trabajo para normativa y posibles revisiones. | Estado del proyecto → **cerrado**. Evidencia, hallazgos, informe y papeles quedan asociados al proyecto. Política de retención: no eliminar antes de `document_retention_years`. | `document_retention_years`: al intentar borrar o al mostrar advertencias. |

Con esto se ve cómo **settings** (NIIF, plantilla por defecto, límites, retención), **plantillas** (estructura del informe) e **IA** (análisis de evidencia, redacción de secciones) encajan en un solo flujo de punta a punta.

### Entidades y lógica necesarias para escalar todo el flujo

Para que la plataforma resuelva todo el flujo de una empresa auditora, hace falta modelar y construir al menos lo siguiente (como punto de partida; luego se refina):

| Entidad o concepto | Propósito | Relación con lo ya existente |
|--------------------|-----------|-----------------------------|
| **Client** (cliente auditado) | Empresa o entidad a la que se le hace la auditoría. Pertenece a la organización (firma). | Organización tiene muchos Clients. |
| **AuditProject / Engagement** (proyecto o encargo de auditoría) | Un encargo concreto: cliente, tipo (financial, compliance, etc.), período (ej. 2024), estado (planning, in_progress, review, closed), fechas, equipo asignado. | Organización tiene muchos AuditProjects. Cada proyecto puede tener evidencia, hallazgos, un informe. |
| **AuditDocument** (evidencia) | Archivo subido (Excel, PDF) asociado a un proyecto; metadata (nombre, storageKey, tipo, análisis IA). | Ya referenciado en .cursorrules (upload → confirm). Vincular a AuditProject. Estado de análisis: pending, processing, completed, failed. |
| **Finding** (hallazgo) | Resultado del análisis (manual o IA): descripción, tipo, severidad, referencia a evidencia, a proyecto. | AuditProject tiene muchos Findings. La IA puede crear hallazgos a partir de AuditDocuments. |
| **ReportTemplate** (plantilla de informe) | Estructura del informe: secciones, textos base, placeholders. Puede ser por organización o global. | OrganizationSetting `report_template_id` apunta a una de estas. |
| **ReportDraft** (borrador de informe) | Versión en curso del informe de un proyecto: secciones rellenadas (manual o IA), plantilla usada, estado (draft, in_review, approved). | Un AuditProject tiene (o tendrá) un ReportDraft (o varios por versiones). |
| **WorkingPaper** (papel de trabajo) | Opcional: registro de un papel de trabajo (descripción, conclusión, vínculos a evidencia). | AuditProject tiene muchos WorkingPapers. |

**Flujos de negocio a implementar (resumen):**

1. **CRUD de clientes** por organización.  
2. **CRUD de proyectos de auditoría**: crear (validando `allowed_audit_types` y `max_audit_projects`), asignar equipo, cambiar estado.  
3. **Carga de evidencia**: ya hay flujo de upload-url y confirm; falta asociar el documento al proyecto (y opcionalmente a área/aseveración) y disparar análisis IA.  
4. **Análisis IA de evidencia**: tras confirmar la subida, encolar o ejecutar análisis (Claude) que lea el documento y genere o sugiera hallazgos.  
5. **CRUD de hallazgos**: crear/editar desde la UI o desde la salida de la IA; vincular a proyecto y a documentos.  
6. **Plantillas**: catálogo de plantillas (por sistema o por organización); estructura + placeholders; `report_template_id` indica la por defecto.  
7. **Borrador de informe**: crear/actualizar borrador por proyecto; rellenar secciones (manual y/o IA desde hallazgos y evidencia); generar PDF/Word final.  
8. **Firma y cierre**: registrar firma del informe, marcar proyecto como cerrado; respetar retención según `document_retention_years`.

Con estos ejemplos y esta lógica, la plataforma puede escalarse para cubrir todo el flujo que una empresa auditora necesita, desde la aceptación del encargo hasta el informe firmado y archivado.

**Referencia para el proceso real y la estructura del proyecto:** El detalle de **qué hace hoy el cliente** (fases, archivo permanente, programas por área, cronograma, hallazgos PCI, informes) y cómo se traduce en **secciones del proyecto** y **asignaciones de colaboradores** está en **docs/design/audit-project-structure-and-assignments.md**. Ese documento se basa en **domain/fases-auditoria-general.md** y **domain/fases-auditoria-especifico.md** y define:
- Las **secciones** que conforman un proyecto de auditoría (Archivo Permanente, Planificación, Programas de auditoría por área, Hallazgos, Informes).
- Que los **programas** son uno por área/cuenta (Bancos, Cuentas por cobrar, etc.), no "un solo programa" por proyecto.
- Cómo los colaboradores participan por **asignaciones**: al proyecto, a actividades del cronograma y a procedimientos ("hecho por" / "revisado por").
- Un **esquema de entidades** (tablas y relaciones) para hacer tangible ese manejo en la plataforma.

---

## Entidades Principales

### Organizaciones (firmas de auditoría)
- Cada organización es una **empresa de auditoría** que usa la plataforma para gestionar proyectos de auditoría contable.
- Cada organización es independiente y aislada; tiene un propietario (`ownerUserId`) con bypass de permisos.
- Campos principales: nombre, razón social, RUC, régimen SRI, contacto (email, teléfono, dirección, país, ciudad), web, logo (`image`), moneda por defecto, zona horaria, locale, número de registro profesional/supervisión, ambiente (pruebas/producción), datos de firma electrónica para informes.
- RUC es único por organización (Ecuador).
- Configuración extensible vía **OrganizationSetting** (clave-valor). Claves sugeridas para auditoría:
  - `default_niif_version` – versión NIIF por defecto en reportes
  - `report_template_id` – plantilla de informe por defecto
  - `document_retention_years` – años de retención de documentos
  - `max_audit_projects` – límite de proyectos (si aplica por plan)
  - `allowed_audit_types` – tipos de auditoría permitidos (JSON)
  - Cualquier otra preferencia por firma que no deba ir en el modelo principal

**¿Cuántos registros hay por empresa?** No es un solo registro por empresa. En `organization_settings` hay **un registro por cada clave de configuración** por organización. Es decir, una misma firma (organización) tiene **varias filas** en la tabla, una por cada setting que use. El índice único es `(organization_id, setting_key)`: cada empresa puede tener como máximo un valor por clave.

Ejemplo para la organización id = 1 (una sola firma):

| id | organization_id | setting_key              | setting_value                    |
|----|------------------|--------------------------|----------------------------------|
| 1  | 1                | default_niif_version     | NIIF PYMES 2023                  |
| 2  | 1                | report_template_id       | 1                                |
| 3  | 1                | document_retention_years | 7                                |
| 4  | 1                | max_audit_projects       | 50                               |
| 5  | 1                | allowed_audit_types      | ["financial","compliance"]       |

Una segunda firma (organization_id = 2) tendría sus propios registros con sus propios valores (otras 5 filas, por ejemplo).

#### Ejemplo de uso de OrganizationSetting

Cada clave se guarda en una **fila distinta** de la tabla `organization_settings`. Ejemplos de valores y cuándo usarlos:

| Clave | Ejemplo de valor | Uso |
|-------|-------------------|-----|
| `default_niif_version` | `"NIIF PYMES 2023"` o `"NIIF Plenas 2023"` | Al generar un informe o reporte de auditoría, si no se eligió versión, tomar esta. También para etiquetar hallazgos o evidencia según marco normativo. |
| `report_template_id` | `"1"` o UUID de plantilla | Al crear un nuevo proyecto o informe, pre-seleccionar esta plantilla (por ejemplo "Informe de auditoría independiente - NIA 700"). Ver más abajo: *¿Quién carga las plantillas?* |
| `document_retention_years` | `"7"` | Años que la firma debe conservar documentos. Usar al mostrar advertencias de eliminación o en políticas de retención; no borrar documentos antes de este plazo. |
| `max_audit_projects` | `"50"` o `"unlimited"` | Antes de crear un nuevo proyecto de auditoría, contar los activos de la organización; si se supera el límite, rechazar creación o mostrar upgrade (según plan). |
| `allowed_audit_types` | `["financial","compliance","operational"]` (JSON string) | Lista de tipos de auditoría que la firma puede crear. Al crear/editar proyecto, validar que `tipo` esté en esta lista; en el frontend, filtrar opciones del selector. |

**¿Quién carga las plantillas de informe?**  
Las plantillas son documentos ya establecidos (ej. estructura NIA 700). Quién las "carga" en la plataforma depende del diseño del producto:

1. **La plataforma (sistema)**  
   Vos definís un catálogo de plantillas estándar (NIA 700, NIA 805, etc.): estructura, textos base, párrafos. Esas plantillas se crean una vez (por vos o por un super-admin) y quedan disponibles para todas las firmas. Nadie "sube" un archivo: las plantillas viven en una tabla/catálogo (ej. `report_templates`). El setting `report_template_id` solo indica **cuál** de esas plantillas usa cada firma por defecto.

2. **Cada firma (organización)**  
   Cada empresa de auditoría **sube o crea sus propias** plantillas (por ejemplo un Word/PDF con su logo y redacción). Esas plantillas se guardan por organización (ej. tabla `organization_report_templates` o archivos en storage por firma). El setting `report_template_id` apunta a **una de las plantillas de esa firma** como la que se usa por defecto al crear un informe nuevo.

3. **Híbrido**  
   La plataforma ofrece plantillas base y la firma puede personalizarlas o añadir las suyas; el default es "cuál de todas (propias + estándar) usar por defecto".

En cualquier caso, `report_template_id` en OrganizationSetting **no es la plantilla en sí**, sino el ID (o identificador) de la plantilla que esa empresa eligió como predeterminada. Quién crea/carga las plantillas (sistema vs firma) es una decisión de producto; lo importante es tener una entidad "plantilla" (tabla o archivos) y que el setting solo guarde "cuál es la por defecto".

**¿Qué son las plantillas: Excel, PDF, algo más? ¿Para qué sirven y cómo se usan con IA?**  

- **Formato de la plantilla:**  
  - **Opción A – Estructura en base de datos (recomendable para IA):** La plantilla no es un archivo, sino una **estructura** en BD: secciones (ej. "Alcance", "Opinión"), textos base y **placeholders** (ej. `{{nombre_cliente}}`, `{{parrafo_alcance}}`). El informe final (PDF o Word) se **genera** rellenando esos placeholders. La IA puede redactar el contenido de cada sección; el sistema arma el documento.  
  - **Opción B – Archivo (Word/PDF):** La plantilla es un archivo (ej. .docx) con estructura y placeholders; el sistema rellena y exporta a PDF. PDF suele ser el **resultado** que se entrega al cliente. Excel tiene más sentido para papeles de trabajo o anexos, no para el informe del auditor en sí.  

- **Para qué seleccionar plantilla:** Para que al crear un **nuevo informe** la plataforma sepa qué **estructura** usar (NIA 700 vs NIA 805, etc.). Es una **pre-selección**; el usuario puede cambiar de plantilla en ese informe o empezar en blanco si el producto lo permite. No está obligado a usar siempre la misma.  

- **¿Se pueden armar documentos con IA en base a esas plantillas?** **Sí.** La plantilla define el **esqueleto** (secciones y placeholders). La **IA** usa evidencia y hallazgos para **redactar o sugerir** el contenido de cada sección. La plataforma combina: (1) estructura de la plantilla, (2) datos del proyecto (cliente, período), (3) contenido generado por IA, y **genera el documento final** (Word/PDF). Plantilla + IA = informes generados de forma asistida.

**Ejemplo en código (lectura):**

```javascript
// Obtener versión NIIF por defecto para la organización
const setting = await OrganizationSetting.findOne({
  where: { organizationId: orgId, settingKey: 'default_niif_version' }
});
const niifVersion = setting?.settingValue ?? 'NIIF PYMES 2023';

// Validar límite de proyectos antes de crear uno nuevo
const maxSetting = await OrganizationSetting.findOne({
  where: { organizationId: orgId, settingKey: 'max_audit_projects' }
});
const maxProjects = maxSetting?.settingValue === 'unlimited' ? Infinity : parseInt(maxSetting?.settingValue || '10', 10);
const currentCount = await AuditProject.count({ where: { organizationId: orgId, status: 'active' } });
if (currentCount >= maxProjects) throw new Error('organization.settings.maxProjectsReached');
```

**Ejemplo en código (escritura):**

```javascript
await OrganizationSetting.upsert({
  organizationId: orgId,
  settingKey: 'default_niif_version',
  settingValue: 'NIIF Plenas 2023'
}, { conflictFields: ['organization_id', 'setting_key'] });
```

### Usuarios
- Los usuarios pertenecen a una sola organización
- Cada usuario tiene un rol que determina sus permisos
- Los usuarios pueden estar activos o inactivos
- Los usuarios se autentican mediante email/username y contraseña

### Roles y Permisos
- Los roles son específicos de la organización (excepto los roles del sistema)
- Los permisos son granulares y están organizados por módulo
- Los roles del sistema no pueden ser modificados (no se pueden agregar/quitar permisos)
- El propietario omite todas las verificaciones de permisos

## Reglas de Negocio

### Gestión de Usuarios

#### Creación de Usuarios
- El email debe ser único globalmente en todas las organizaciones
- El username debe ser único globalmente en todas las organizaciones
- El número de documento (`documentNumber`) debe ser único por organización y tipo de documento
- La contraseña se hashea automáticamente antes de guardar
- Los nuevos usuarios se crean como activos por defecto
- Los usuarios solo pueden ser creados dentro de la misma organización que el creador

#### Actualización de Usuarios
- Los usuarios pueden actualizar su propio perfil (si tienen el permiso `users.editInfo`)
- Los usuarios pueden actualizar otros usuarios en la misma organización (si tienen los permisos apropiados)
- Solo el propietario puede desactivar su propia cuenta
- Otros usuarios no pueden desactivar la cuenta del propietario
- Actualizar campos sensibles requiere permisos específicos:
  - `users.editPassword` - para cambiar contraseña
  - `users.editRole` - para cambiar el rol del usuario
  - `users.editStatus` - para activar/desactivar usuario
  - `users.editInfo` - para actualizar nombre, email, teléfono, documento, username
- Los permisos solo se verifican si el nuevo valor difiere del valor actual
- La unicidad del email es global
- La unicidad del username es global
- La unicidad del número de documento es por organización y tipo de documento

#### Listado de Usuarios
- El listado de usuarios excluye al usuario autenticado actualmente
- Los usuarios solo pueden ver usuarios de su propia organización
- Requiere permiso `users.view` (o bypass del propietario)

#### Eliminación de Usuarios
- Usa borrado lógico (soft delete)
- Los usuarios eliminados se marcan con el timestamp `deletedAt`
- Requiere permiso `users.delete` (o bypass del propietario)

### Gestión de Roles

#### Creación de Roles
- Los roles son específicos de la organización
- Los nombres de roles deben ser únicos dentro de una organización
- Los roles pueden ser marcados como roles del sistema (`isSystem: true`)
- Requiere permiso `roles.create` (o bypass del propietario)

#### Actualización de Roles
- Se puede actualizar el nombre y descripción del rol
- Se pueden asignar/quitar permisos a/de un rol
- Los roles del sistema (`isSystem: true`) no pueden ser modificados:
  - No se pueden agregar permisos
  - No se pueden quitar permisos
  - No se puede cambiar el nombre o descripción
- Requiere permiso `roles.update` (o bypass del propietario)

#### Eliminación de Roles
- Los roles del sistema no pueden ser eliminados
- Usa borrado lógico (soft delete)
- Requiere permiso `roles.delete` (o bypass del propietario)

### Sistema de Permisos

#### Estructura de Permisos
- Los permisos están organizados por módulos (ej: `users`, `roles`)
- Los códigos de permisos siguen el patrón: `{module}.{action}`
- Ejemplos:
  - `users.create` - Crear usuarios
  - `users.view` - Ver/listar usuarios
  - `users.editInfo` - Editar información del usuario
  - `users.editPassword` - Cambiar contraseña del usuario
  - `users.editRole` - Cambiar rol del usuario
  - `users.editStatus` - Activar/desactivar usuario
  - `users.delete` - Eliminar usuarios
  - `roles.view` - Ver/listar roles
  - `roles.create` - Crear roles
  - `roles.update` - Actualizar roles y asignar permisos
  - `roles.delete` - Eliminar roles
  - `permissions.view` - Ver permisos disponibles

#### Verificación de Permisos
- Los permisos se verifican mediante el middleware `requirePermission`
- El propietario de la organización (`ownerUserId`) omite todas las verificaciones de permisos
- Los usuarios deben tener el permiso requerido en su rol
- Los permisos se verifican dinámicamente según qué campos se están actualizando

### Autenticación y Sesiones

#### Login
- Los usuarios se autentican con email/username y contraseña
- En login exitoso:
  - Se genera un token JWT
  - Se crea una sesión de usuario
  - Se actualiza `lastLoginAt`
  - Se retorna el perfil completo del usuario:
    - Datos del usuario (sin contraseña)
    - Datos de la organización
    - Datos del rol
    - Lista de permisos
    - Bandera `isOwner`

#### Logout
- Invalida la sesión actual del usuario
- La sesión se marca como inactiva
- Requiere autenticación

#### Gestión de Sesiones
- Las sesiones se rastrean por usuario
- Las sesiones pueden ser invalidadas en logout
- Los tokens JWT se validan en cada petición

### Auditoría y Logging

#### Logs de Auditoría
- Las acciones de los usuarios se registran en `AuditLog`
- Los logs incluyen:
  - Usuario que realizó la acción
  - Contexto de la organización
  - Tipo de acción y detalles
  - Timestamp

#### Logs de Aplicación
- Los logs de la aplicación se escriben en archivos en el directorio `logs/`
- Los logs están organizados por fecha
- Niveles de log: error, warn, info, debug
- Los logs rotan por fecha

## Reglas de Integridad de Datos

### Restricciones de Unicidad

1. **Email**: Único globalmente en todas las organizaciones
2. **Username**: Único globalmente en todas las organizaciones
3. **Número de Documento**: Único por organización y tipo de documento
4. **Nombre de Rol**: Único por organización

### Restricciones de Claves Foráneas

- Usuarios → Organización (CASCADE on delete)
- Usuarios → Rol (restringido)
- Roles → Organización (CASCADE on delete)

### Comportamiento de Borrado Lógico

- Los modelos con `paranoid: true` usan borrado lógico:
  - User
  - Organization
  - Role
- Los registros eliminados lógicamente se marcan con el timestamp `deletedAt`
- Los registros eliminados lógicamente se excluyen de las consultas por defecto
- El borrado físico no se usa (excepto para logs)

## Flujos de Trabajo

### Flujo de Registro de Usuario
1. El propietario crea la organización
2. El propietario crea el primer usuario (él mismo)
3. El propietario crea roles y asigna permisos
4. El propietario crea usuarios adicionales y asigna roles
5. Los usuarios pueden entonces operar dentro de sus permisos

### Flujo de Validación de Permisos
1. La petición llega con token JWT
2. El token se valida y se carga el usuario
3. Se determina la organización del usuario
4. Si el usuario es propietario → omite todas las verificaciones
5. De lo contrario, verifica si el rol del usuario tiene el permiso requerido
6. Si falta el permiso → retorna 403 Forbidden
7. Si existe el permiso → procede con la petición

## Reglas de Validación

### Campos de Usuario
- `fullName`: Requerido, string
- `email`: Requerido, formato de email válido, único globalmente
- `username`: Opcional, único globalmente si se proporciona
- `phone`: Opcional, string
- `documentType`: Requerido, enum: 'cedula', 'ruc', 'pasaporte'
- `documentNumber`: Requerido, único por organización y tipo de documento
- `password`: Requerido en creación, hasheado antes de guardar
- `isActive`: Boolean, por defecto `true`
- `roleId`: Requerido, debe existir y pertenecer a la misma organización

## Reglas de Seguridad

### Bypass del Propietario
- El propietario de la organización (`ownerUserId`) omite todas las verificaciones de permisos
- Esto permite la configuración inicial y previene escenarios de bloqueo
- El propietario puede realizar cualquier acción sin permisos explícitos

### Aislamiento de Datos
- Los usuarios solo pueden acceder a datos de su propia organización
- Las consultas siempre deben filtrar por `organizationId`
- El acceso entre organizaciones está prevenido

### Seguridad de Contraseñas
- Las contraseñas se hashean usando bcryptjs
- Rondas de salt: 10
- Las contraseñas nunca se retornan en las respuestas de la API
- La verificación de contraseñas usa comparación segura

### Seguridad JWT
- Los tokens expiran después del tiempo configurado
- Los tokens se validan en cada petición
- Los tokens inválidos o expirados resultan en 401 Unauthorized

## Manejo de Errores

### Formato de Respuesta de Error
```json
{
  "statusCode": 400,
  "message": "Mensaje de error traducido",
  "errorCode": "error.code.key",
  "errors": {
    "campo": ["Mensaje de error 1", "Mensaje de error 2"]
  }
}
```

### Códigos de Error Comunes
- `permissions.userNotAuthenticated` - Usuario no autenticado
- `permissions.userNotFound` - Usuario no encontrado
- `permissions.insufficientPermissions` - Permisos insuficientes
- `users.emailExists` - El email ya existe
- `users.usernameExists` - El username ya existe
- `users.documentExists` - El número de documento ya existe
- `users.notFound` - Usuario no encontrado
- `roles.notFound` - Rol no encontrado
- `roles.cannotModifySystem` - No se puede modificar rol del sistema
- `validation.invalid` - Error de validación

## Notas para Desarrolladores

1. **Siempre filtrar por organización**: Al consultar datos, siempre incluir filtro `organizationId`
2. **Verificar bypass del propietario**: Antes de verificar permisos, verificar si el usuario es propietario
3. **Usar borrado lógico**: Siempre usar métodos de borrado lógico, nunca borrado físico
4. **Validar unicidad**: Verificar restricciones de unicidad antes de crear/actualizar
5. **Usar transacciones**: Para operaciones complejas que involucren múltiples modelos, usar transacciones de base de datos
6. **Traducir errores**: Todos los mensajes de error deben usar claves de traducción
7. **Respetar permisos**: Siempre verificar permisos a menos que el usuario sea propietario
8. **Mantener auditoría**: Registrar acciones importantes en los logs de auditoría
