# Usuarios, Roles y Permisos — Guía Frontend

---

## Usuarios

### Listar usuarios

```
POST /api/v1/users/list
Authorization: Bearer <token>
```

```json
{
  "data": {
    "page": 1,
    "limit": 20,
    "search": "juan"
  }
}
```

**Respuesta:**

```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "fullName": "Juan Pérez",
        "email": "juan@example.com",
        "documentType": "cedula",
        "documentNumber": "1234567890",
        "phone": "0991234567",
        "isActive": true,
        "role": {
          "id": 2,
          "name": "Auditor"
        }
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

### Crear usuario

```
POST /api/v1/users/create
Requiere permiso: users.create
```

```json
{
  "data": {
    "fullName": "María López",
    "email": "maria@example.com",
    "password": "pass123456",
    "roleId": 2,
    "documentType": "cedula",
    "documentNumber": "0912345678",
    "phone": "0998765432",
    "username": "mlopez"
  }
}
```

**Campos obligatorios:** `fullName`, `email`, `password`, `roleId`, `documentType`, `documentNumber`

**Campos opcionales:** `phone`, `username`

**Tipos de documento:** `cedula`, `ruc`, `pasaporte`

### Actualizar usuario

```
POST /api/v1/users/update
```

```json
{
  "data": {
    "id": 3,
    "fullName": "María López García",
    "phone": "0991111111",
    "isActive": false
  }
}
```

### Ver perfil propio

```
POST /api/v1/users/profile
```

```json
{ "data": {} }
```

Retorna los datos completos del usuario autenticado, incluyendo rol, permisos y organización.

---

## Roles

### Listar roles

```
POST /api/v1/roles/list
Requiere permiso: roles.view
```

```json
{ "data": {} }
```

**Respuesta:**

```json
{
  "data": {
    "roles": [
      {
        "id": 1,
        "name": "Administrador",
        "description": "Acceso total",
        "permissions": [
          { "id": 1, "code": "users.create", "description": "Crear usuarios" },
          { "id": 2, "code": "users.view", "description": "Ver usuarios" }
        ]
      },
      {
        "id": 2,
        "name": "Auditor",
        "permissions": [...]
      }
    ]
  }
}
```

### Crear rol

```
POST /api/v1/roles/create
Requiere permiso: roles.create
```

```json
{
  "data": {
    "name": "Supervisor",
    "description": "Supervisa proyectos de auditoría"
  }
}
```

### Actualizar rol

```
POST /api/v1/roles/update
Requiere permiso: roles.update
```

```json
{
  "data": {
    "id": 3,
    "name": "Supervisor Senior",
    "description": "Supervisa y aprueba"
  }
}
```

### Eliminar rol

```
POST /api/v1/roles/delete
Requiere permiso: roles.delete
```

```json
{
  "data": {
    "id": 3
  }
}
```

### Asignar permisos a un rol

```
POST /api/v1/roles/assign-permissions
Requiere permiso: roles.update
```

```json
{
  "data": {
    "roleId": 2,
    "permissionIds": [1, 2, 5, 8, 12]
  }
}
```

Reemplaza todos los permisos del rol con los IDs enviados.

---

## Permisos

### Listar permisos disponibles

```
POST /api/v1/permissions/list
Requiere permiso: permissions.view
```

```json
{ "data": {} }
```

**Respuesta:**

```json
{
  "data": {
    "permissions": [
      { "id": 1, "code": "users.create", "module": "users", "description": "Crear usuarios" },
      { "id": 2, "code": "users.view", "module": "users", "description": "Ver usuarios" },
      { "id": 3, "code": "users.update", "module": "users", "description": "Actualizar usuarios" },
      { "id": 4, "code": "users.delete", "module": "users", "description": "Eliminar usuarios" },
      { "id": 5, "code": "roles.create", "module": "roles", "description": "Crear roles" },
      { "id": 6, "code": "roles.view", "module": "roles", "description": "Ver roles" },
      { "id": 7, "code": "roles.update", "module": "roles", "description": "Actualizar roles" },
      { "id": 8, "code": "roles.delete", "module": "roles", "description": "Eliminar roles" },
      { "id": 9, "code": "files.upload", "module": "files", "description": "Subir archivos" },
      { "id": 10, "code": "permissions.view", "module": "permissions", "description": "Ver permisos" }
    ]
  }
}
```

---

## Componente: Gestión de roles con permisos

```jsx
function RolePermissions({ roleId }) {
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    // Cargar todos los permisos disponibles
    api.post('/permissions/list').then(data => {
      setAllPermissions(data.permissions);
    });

    // Cargar permisos actuales del rol
    api.post('/roles/list').then(data => {
      const role = data.roles.find(r => r.id === roleId);
      if (role) setSelectedIds(role.permissions.map(p => p.id));
    });
  }, [roleId]);

  // Agrupar permisos por módulo para la UI
  const grouped = allPermissions.reduce((acc, p) => {
    const mod = p.module || p.code.split('.')[0];
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  async function handleSave() {
    await api.post('/roles/assign-permissions', {
      roleId,
      permissionIds: selectedIds
    });
  }

  function toggle(permId) {
    setSelectedIds(prev =>
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  }

  return (
    <div>
      {Object.entries(grouped).map(([module, perms]) => (
        <fieldset key={module}>
          <legend>{module}</legend>
          {perms.map(p => (
            <label key={p.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => toggle(p.id)}
              />
              {p.description || p.code}
            </label>
          ))}
        </fieldset>
      ))}
      <button onClick={handleSave}>Guardar permisos</button>
    </div>
  );
}
```

---

## Nota sobre el owner de la organización

El usuario que creó la organización (owner) **siempre tiene acceso total**, sin importar qué rol o permisos tenga asignados. El backend lo verifica automáticamente por `organization.ownerUserId === user.id`. En el frontend no es necesario hacer nada especial para esto.
