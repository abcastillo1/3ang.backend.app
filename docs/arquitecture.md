# Prompt de Arquitectura para Generación de Estructura Base

## Contexto
Necesito que generes la estructura base de un proyecto backend siguiendo esta arquitectura específica. El proyecto debe estar organizado de manera modular y escalable.

## Stack Tecnológico Base
- **Framework**: Express.js
- **ORM**: Sequelize con MySQL
- **Validación**: express-validator
- **Autenticación**: JWT (jsonwebtoken)
- **Logging**: Sistema de logging a archivos locales
- **Seguridad**: Helmet, bcryptjs
- **Manejo de archivos**: Multer (o similar para uploads)
- **Internacionalización**: Sistema de traducciones con archivos JSON

## Estructura de Directorios

### 1. Estructura Principal

```
proyecto/
├── app/                    # Controladores/Handlers de endpoints
│   ├── [modulo]/          # Cada módulo de negocio tiene su carpeta
│   │   ├── [accion]/      # Cada acción tiene su carpeta
│   │   │   └── route.js   # Handler principal de la ruta
│   │   └── ...
├── models/                # Modelos de Sequelize organizados por dominio
│   ├── [dominio]/         # Ej: usuarios/, entidades/, operaciones/
│   │   └── [modelo].js    # Definición del modelo Sequelize
│   ├── database.js        # Conexión a base de datos (exporta instancia de Models)
│   └── index.js           # Clase principal Models que instancia todos los modelos
├── routes/                # Definición de rutas Express
│   ├── index.js            # Router principal que agrupa todos los módulos
│   └── [modulo].js         # Router específico de cada módulo
├── middleware/            # Middlewares reutilizables
│   ├── body-validator.js  # Validación global del body
│   ├── validation.js      # Middleware de validación de express-validator
│   ├── auth.js            # Autenticación JWT
│   └── [modulo]/          # Middlewares específicos por módulo
├── helpers/               # Funciones auxiliares y utilidades
│   ├── response.js        # Helper para respuestas estandarizadas
│   ├── validator.js       # Wrapper de express-validator
│   ├── controller-wrapper.js  # Wrapper que captura TODOS los errores automáticamente (evita try-catch en controladores)
│   ├── logger.js          # Configuración de logging a archivos locales
│   └── [otras utilidades]
├── logs/                  # Directorio para archivos de log (opcional, puede estar en .gitignore)
├── config/                # Configuración del proyecto
│   ├── environment.js     # Carga y exportación de variables de entorno
│   └── constants.js       # Constantes del sistema (HTTP_STATUS, etc.)
├── assets/                # Recursos estáticos
│   └── translations/      # Archivos de traducción JSON
├── server.js              # Clase Server que configura Express
├── index.js               # Punto de entrada principal (usa require)
└── package.json           # Dependencias del proyecto (CommonJS)
```

## Patrones de Arquitectura

### 1. Organización de Rutas

**Estructura de rutas en `routes/`:**
- Cada módulo tiene su archivo router (ej: `routes/usuarios.js`, `routes/entidades.js`)
- Los routers importan y registran los controladores usando un helper
- El router principal (`routes/index.js`) agrupa todos los módulos bajo `/api/v1`

**Ejemplo de router de módulo (`routes/usuarios.js`):**
```javascript
const { Router } = require('express');
const { registerRoute } = require('../helpers/controller-wrapper');

const router = Router();

registerRoute(router, '/crear', require('../app/usuarios/crear/route'));
registerRoute(router, '/actualizar', require('../app/usuarios/actualizar/route'));
registerRoute(router, '/listar', require('../app/usuarios/listar/route'));

module.exports = router;
```

**Ejemplo de router principal (`routes/index.js`):**
```javascript
const { Router } = require('express');
const Usuarios = require('./usuarios');
const Entidades = require('./entidades');
// ... otros módulos

const mainRouter = Router();

mainRouter.use('/usuarios', Usuarios);
mainRouter.use('/entidades', Entidades);
// ... otros módulos

module.exports = mainRouter;
```

### 2. Estructura de Controladores (`app/[modulo]/[accion]/route.js`)

Cada controlador sigue este patrón:

```javascript
const { validateField } = require('../../helpers/validator');
const apiResponse = require('../../helpers/response');
const validateRequest = require('../../middleware/validation');
const authenticate = require('../../middleware/auth');
// ... otros middlewares específicos
const db = require('../../models/database');

const { Usuario, Entidad } = db;

// Array de validadores y middlewares
const validators = [
  validateField('data.nombre').isLength({ min: 2 }).withMessage('validators.nombre.minLength'),
  validateField('data.email').isEmail().withMessage('validators.email.invalid'),
  validateRequest,
  authenticate,
  // ... otros middlewares específicos
];

// Handler principal
async function handler(req, res, next) {
  const { data } = req.body;
  
  // Lógica del controlador
  const result = await Usuario.create(data);
  
  return apiResponse(res, req, next)(result);
}

module.exports = {
  validators,
  default: handler
};
```

**Características importantes:**
- Exporta un objeto con `validators` (array) y `default` (función handler)
- Usa el helper de respuestas para respuestas estandarizadas
- Los modelos se importan desde `models/database`
- **NO usa try-catch** - El wrapper de controladores captura todos los errores automáticamente
- Los errores se lanzan con `throw` y el wrapper los maneja centralizadamente

### 3. Sistema de Validación

**Validación con express-validator:**
- Se usa un helper wrapper de express-validator (ej: `validateField()`)
- Los mensajes de error son códigos de traducción (ej: `'validators.nombre.minLength'`)
- El middleware de validación valida los resultados y aborta si hay errores
- Las validaciones se ejecutan antes del handler principal

**Ejemplo:**
```javascript
validateField('data.email')
  .isEmail()
  .withMessage('validators.email.invalid')
```

### 4. Manejo de Respuestas

**Helper de respuestas (`helpers/response.js`):**
- Función helper para respuestas estandarizadas
- Formato estándar de respuesta exitosa:
  ```javascript
  {
    statusCode: 200,
    message: "Operación exitosa", // Traducido según idioma
    data: { ... }
  }
  ```
- Formato estándar de error:
  ```javascript
  {
    statusCode: 400,
    message: "Mensaje traducido",
    errorCode: "codigo.error",
    errors: { campo: ["error1", "error2"] }
  }
  ```

**Uso:**
```javascript
return apiResponse(res, req, next)(data); // Éxito
return apiResponse(res, req, next)(null, { status: 404, code: 'recurso.noEncontrado' }); // Error
```

### 5. Manejo de Errores

**Manejo centralizado de errores:**
- **NO se usan try-catch en los controladores** - El wrapper de controladores (`controller-wrapper.js`) captura todos los errores automáticamente
- Los errores se lanzan simplemente con `throw` y el wrapper los captura
- Si el error tiene `status` y `code`, se formatea como respuesta de error
- Si no, se trata como error interno del servidor (500)
- Todo el manejo de errores está centralizado en un solo punto (el wrapper)

**Ejemplo de lanzamiento de error (sin try-catch):**
```javascript
// En el controlador - NO usar try-catch
async function handler(req, res, next) {
  const usuario = await Usuario.findOne({ where: { id: req.params.id } });
  
  if (!usuario) {
    const error = new Error('Recurso no encontrado');
    error.status = 404;
    error.code = 'recurso.noEncontrado';
    throw error; // El wrapper captura esto automáticamente
  }
  
  // Más lógica sin try-catch...
  await usuario.update(req.body.data);
  return apiResponse(res, req, next)(usuario);
}
```

**Cómo funciona el wrapper (`helpers/controller-wrapper.js`):**
- El wrapper envuelve cada controlador y sus middlewares en un try-catch automático
- Captura cualquier error lanzado (sincrónico o asíncrono) en el controlador o sus middlewares
- Formatea la respuesta según el tipo de error (si tiene `status` y `code`)
- Los códigos de error son claves de traducción que se traducen automáticamente
- Esto permite escribir controladores sin try-catch, manteniendo el código más limpio

**Ejemplo del wrapper (conceptual):**
```javascript
// helpers/controller-wrapper.js (simplificado)
function registerRoute(router, path, routeModule) {
  router.post(path, async (req, res, next) => {
    try {
      // Ejecuta validators y handler
      await executeValidators(routeModule.validators, req, res);
      await routeModule.default(req, res, next);
    } catch (error) {
      // Manejo centralizado de errores aquí
      return handleError(error, req, res);
    }
  });
}
```

### 6. Modelos Sequelize

**Estructura de modelos (`models/[dominio]/[modelo].js`):**
```javascript
module.exports = (sequelize, DataTypes) => {
  const Modelo = sequelize.define(
    'Modelo',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      campo: { type: DataTypes.STRING, allowNull: false },
      // ... otros campos
    },
    {
      paranoid: true, // Soft deletes
      tableName: 'nombre_tabla',
    }
  );

  // Métodos de instancia
  Modelo.prototype.metodoPersonalizado = function() { ... };

  // Métodos estáticos
  Modelo.metodoEstatico = async function() { ... };

  // Relaciones
  Modelo.associate = function (models) {
    models.Modelo.belongsTo(models.OtroModelo, {
      foreignKey: 'otroModeloId',
      as: 'OtroModelo',
    });
  };

  return Modelo;
};
```

**Clase Models (`models/index.js`):**
- Instancia Sequelize con configuración de lectura/escritura
- Método para registrar cada modelo
- Método `associate()` que ejecuta todas las asociaciones
- Exporta instancia única de la clase Models

**Uso de modelos:**
```javascript
const db = require('./database');
const { Usuario, Entidad } = db;

const usuario = await Usuario.findOne({ where: { id: 1 } });
const usuarios = await Usuario.findAll({ where: { activo: true } });
```

### 7. Middlewares

**Middlewares globales (en `server.js`):**
- `helmet()` - Seguridad HTTP
- `bodyParser` - Parsing de JSON y URL encoded
- Middleware de internacionalización - Añade función de traducción
- Middleware de validación del body - Valida estructura básica

**Middlewares específicos:**
- `auth` - Verifica JWT y carga información del usuario en `req.user`
- `validation` - Valida resultados de express-validator
- `permissions` - Verifica permisos del usuario
- Middlewares específicos por módulo en `middleware/[modulo]/`

**Patrón de middleware:**
```javascript
module.exports = async function (req, res, next) {
  // Lógica del middleware
  // Puede modificar req, res
  // Llamar next() para continuar o lanzar error para abortar
  next();
};
```

### 8. Configuración de Variables de Entorno

**Carga de variables (`config/environment.js`):**
- Carga variables de entorno desde `process.env`
- Valida variables críticas al inicio de la aplicación
- Exporta variables necesarias para el proyecto

**Ejemplo:**
```javascript
require('dotenv').config();

const requiredVars = ['DATABASE_HOST', 'DATABASE_NAME', 'JWT_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Faltan variables de entorno requeridas:', missingVars.join(', '));
  process.exit(1);
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_NAME: process.env.DATABASE_NAME,
  JWT_SECRET: process.env.JWT_SECRET,
  // ... otras variables
};
```

### 9. Clase Server (`server.js`)

**Responsabilidades:**
- Configura Express con middlewares globales
- Registra rutas bajo `/api/v1`
- Maneja errores globales
- Configura timeout del servidor

**Estructura:**
```javascript
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const mainRouter = require('./routes');

class Server {
  constructor() {
    this.app = express();
    this.serverInstance = null;
  }

  initializeApp() {
    // Configuración de seguridad
    this.app.use(helmet());
    this.app.use(bodyParser.json());
    
    // Middlewares globales
    this.app.use(require('./middleware/i18n')());
    this.app.use(require('./middleware/body-validator'));
    
    // Rutas
    this.app.use('/api/v1', mainRouter);
    
    // Manejo de errores
    this.app.use((err, req, res, next) => {
      // Log y respuesta de error
    });
    
    return this.app;
  }

  start() {
    const { PORT } = require('./config/environment');
    
    this.initializeApp();
    this.serverInstance = this.app.listen(PORT);
  }
}

module.exports = Server;
```

### 10. Internacionalización

**Sistema de traducciones:**
- Archivos JSON en `assets/translations/`
- Middleware de i18n añade función de traducción a cada request (ej: `req.translate()`)
- Los códigos de error son claves de traducción
- Soporte multi-idioma con idioma por defecto y header de idioma

**Uso:**
```javascript
const message = req.translate('validators.email.invalid');
```

### 11. Logging

**Sistema de logging (`helpers/logger.js`):**
- Escribe logs a archivos locales en el directorio `logs/`
- Métodos: `logError()`, `logInfo()`, etc.
- Rotación de archivos de log (por fecha o tamaño)
- Formato estructurado de logs (texto plano o JSON)
- Diferentes niveles de log: error, warn, info, debug

## Convenciones de Código

### Nombres de archivos y carpetas
- **Rutas**: `app/[modulo]/[accion]/route.js`
- **Modelos**: `models/[dominio]/[modelo].js` (singular)
- **Routers**: `routes/[modulo].js` (plural)
- **Middlewares**: `middleware/[nombre].js` o `middleware/[modulo]/[nombre].js`

### Estructura de Request/Response
- **Request body**: Siempre envuelto en `{ data: { ... } }`
- **Validaciones**: Usan el helper de validación con `'data.campo'`
- **Respuestas**: Usan el helper de respuestas estandarizado

### Manejo de errores
- **NO usar try-catch en controladores** - El wrapper captura todos los errores automáticamente
- Lanzar errores con `throw` y propiedades `status` y `code`
- Los códigos de error son claves de traducción
- El sistema captura y formatea automáticamente en un punto centralizado

### Base de datos
- Usar transacciones para operaciones complejas
- Soft deletes con `paranoid: true` en modelos (opcional)

## Flujo de una Petición

1. **Request llega** → `server.js` recibe la petición
2. **Middlewares globales** → Helmet, BodyParser, i18n, validación de body
3. **Router** → `routes/index.js` → `routes/[modulo].js`
4. **Helper de registro** → Wrapper de controladores registra validators y handler
5. **Validators** → Se ejecutan en orden (validaciones, auth, permisos, etc.)
6. **Handler** → Función `default` del controlador ejecuta la lógica
7. **Response** → Helper de respuestas formatea y envía la respuesta
8. **Error handling** → Si hay error, el wrapper lo captura y formatea

## Consideraciones Importantes

1. **Usar JavaScript puro (Node.js)** - no TypeScript
2. **No incluir tests** (el usuario no los utilizará)
3. **Mantener la estructura modular** - cada módulo es independiente
4. **Usar helpers reutilizables** - helpers de respuesta, validación, wrapper de controladores
5. **Validación en dos niveles** - express-validator + validaciones de negocio
6. **Logging a archivos locales** - para debugging y monitoreo, con rotación de archivos
7. **Manejo centralizado de errores** - NO usar try-catch en controladores, el wrapper captura todo automáticamente
8. **Internacionalización desde el inicio** - códigos de error traducibles
9. **Seguridad por capas** - Helmet, validación, autenticación, autorización
10. **Adaptar nombres** - usar terminología apropiada para el dominio del negocio

## Ejemplo de Módulo Completo

Para un módulo de ejemplo (adaptar nombres según dominio del negocio):

**1. Modelo** (`models/articulos/articulo.js`):
```javascript
module.exports = (sequelize, DataTypes) => {
  const Articulo = sequelize.define('Articulo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, {
    tableName: 'articulos',
    paranoid: true,
  });

  Articulo.associate = function(models) {
    // Relaciones con otros modelos
  };

  return Articulo;
};
```

**2. Controlador** (`app/articulos/crear/route.js`):
```javascript
const { validateField } = require('../../../helpers/validator');
const apiResponse = require('../../../helpers/response');
const validateRequest = require('../../../middleware/validation');
const authenticate = require('../../../middleware/auth');
const db = require('../../../models/database');

const { Articulo } = db;

const validators = [
  validateField('data.nombre').isLength({ min: 3 }).withMessage('validators.articulo.nombre'),
  validateField('data.precio').isFloat({ min: 0 }).withMessage('validators.articulo.precio'),
  validateRequest,
  authenticate,
];

async function handler(req, res, next) {
  // NO usar try-catch aquí - el wrapper captura errores automáticamente
  const { data } = req.body;
  
  // Si hay error, simplemente lanzarlo con throw
  const articulo = await Articulo.create(data);
  
  return apiResponse(res, req, next)(articulo);
}

module.exports = {
  validators,
  default: handler
};
```

**3. Router** (`routes/articulos.js`):
```javascript
const { Router } = require('express');
const { registerRoute } = require('../helpers/controller-wrapper');

const router = Router();

registerRoute(router, '/crear', require('../app/articulos/crear/route'));
registerRoute(router, '/listar', require('../app/articulos/listar/route'));
registerRoute(router, '/actualizar', require('../app/articulos/actualizar/route'));

module.exports = router;
```

**4. Registro en router principal** (`routes/index.js`):
```javascript
const { Router } = require('express');
const Articulos = require('./articulos');
// ... otros módulos

const mainRouter = Router();

mainRouter.use('/articulos', Articulos);
// ... otros módulos

module.exports = mainRouter;
```

---
