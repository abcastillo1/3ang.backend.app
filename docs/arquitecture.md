# Prompt de Arquitectura para Generación de Estructura Base

## Contexto
Necesito que generes la estructura base de un proyecto backend siguiendo esta arquitectura específica. El proyecto debe estar organizado de manera modular y escalable.

**Importante:**
- Todo el código del API debe estar en **inglés** (nombres de variables, funciones, archivos, carpetas, mensajes de error, etc.)
- Los comentarios deben ser **mínimos** - solo cuando sea absolutamente necesario para clarificar lógica compleja o no obvia

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
│   ├── [dominio]/         # Ej: users/, entities/, operations/
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
├── index.js               # Punto de entrada principal
└── package.json           # Dependencias del proyecto (con "type": "module" para ES modules)
```

## Patrones de Arquitectura

### 1. Organización de Rutas

**Estructura de rutas en `routes/`:**
- Cada módulo tiene su archivo router (ej: `routes/users.js`, `routes/entities.js`)
- Los routers importan y registran los controladores usando un helper
- El router principal (`routes/index.js`) agrupa todos los módulos bajo `/api/v1`
- Todo en inglés: nombres de archivos, rutas, funciones

**Ejemplo de router de módulo (`routes/users.js`):**
```javascript
import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';

const router = Router();

registerRoute(router, '/create', await import('../app/users/create/route.js'));
registerRoute(router, '/update', await import('../app/users/update/route.js'));
registerRoute(router, '/list', await import('../app/users/list/route.js'));

export default router;
```

**Ejemplo de router principal (`routes/index.js`):**
```javascript
import { Router } from 'express';
import Users from './users.js';
import Entities from './entities.js';

const mainRouter = Router();

mainRouter.use('/users', Users);
mainRouter.use('/entities', Entities);

export default mainRouter;
```

### 2. Estructura de Controladores (`app/[modulo]/[accion]/route.js`)

Cada controlador sigue este patrón:

```javascript
import { validateField } from '../../helpers/validator.js';
import apiResponse from '../../helpers/response.js';
import validateRequest from '../../middleware/validation.js';
import authenticate from '../../middleware/auth.js';
import db from '../../models/database.js';

const { User, Entity } = db;

export const validators = [
  validateField('data.name').isLength({ min: 2 }).withMessage('validators.name.minLength'),
  validateField('data.email').isEmail().withMessage('validators.email.invalid'),
  validateRequest,
  authenticate,
];

export default async function handler(req, res, next) {
  const { data } = req.body;
  const result = await User.create(data);
  return apiResponse(res, req, next)(result);
}
```

**Características importantes:**
- Exporta `validators` (array) y `default` (función handler) por separado
- Usa el helper de respuestas para respuestas estandarizadas
- Los modelos se importan desde `models/database.js`
- **NO usa try-catch** - El wrapper de controladores captura todos los errores automáticamente
- Los errores se lanzan con `throw` y el wrapper los maneja centralizadamente
- Usa ES modules (`import/export`) - el proyecto debe tener `"type": "module"` en `package.json`

### 3. Sistema de Validación

**Validación con express-validator:**
- Se usa un helper wrapper de express-validator (ej: `validateField()`)
- Los mensajes de error son códigos de traducción en inglés (ej: `'validators.name.minLength'`)
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
export default async function handler(req, res, next) {
  const user = await User.findOne({ where: { id: req.params.id } });
  
  if (!user) {
    const error = new Error('Resource not found');
    error.status = 404;
    error.code = 'resource.notFound';
    throw error;
  }
  
  await user.update(req.body.data);
  return apiResponse(res, req, next)(user);
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
export async function registerRoute(router, path, routeModulePromise) {
  const routeModule = await routeModulePromise;
  
  router.post(path, async (req, res, next) => {
    try {
      await executeValidators(routeModule.validators, req, res);
      await routeModule.default(req, res, next);
    } catch (error) {
      return handleError(error, req, res);
    }
  });
}
```

**Nota importante sobre ES modules:**
- El proyecto debe tener `"type": "module"` en `package.json`
- Las importaciones deben incluir la extensión `.js` explícitamente
- Los imports dinámicos usan `await import()` en lugar de `require()`

**Convenciones de código:**
- **Todo en inglés**: nombres de archivos, carpetas, variables, funciones, mensajes de error, nombres de tablas
- **Comentarios mínimos**: solo cuando sea necesario para clarificar lógica compleja o no obvia
- El código debe ser autoexplicativo a través de nombres descriptivos en inglés

### 6. Modelos Sequelize

**Estructura de modelos (`models/[dominio]/[modelo].js`):**
```javascript
export default (sequelize, DataTypes) => {
  const Model = sequelize.define(
    'Model',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      field: { type: DataTypes.STRING, allowNull: false },
    },
    {
      paranoid: true,
      tableName: 'table_name',
    }
  );

  Model.prototype.customMethod = function() { ... };

  Model.staticMethod = async function() { ... };

  Model.associate = function (models) {
    models.Model.belongsTo(models.OtherModel, {
      foreignKey: 'otherModelId',
      as: 'OtherModel',
    });
  };

  return Model;
};
```

**Clase Models (`models/index.js`):**
- Instancia Sequelize con configuración de lectura/escritura
- Método para registrar cada modelo
- Método `associate()` que ejecuta todas las asociaciones
- Exporta instancia única de la clase Models

**Uso de modelos:**
```javascript
import db from './database.js';

const { User, Entity } = db;

const user = await User.findOne({ where: { id: 1 } });
const users = await User.findAll({ where: { active: true } });
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
export default async function (req, res, next) {
  next();
}
```

### 8. Configuración de Variables de Entorno

**Carga de variables (`config/environment.js`):**
- Carga variables de entorno desde `process.env`
- Valida variables críticas al inicio de la aplicación
- Exporta variables necesarias para el proyecto

**Ejemplo:**
```javascript
import 'dotenv/config';

const requiredVars = ['DATABASE_HOST', 'DATABASE_NAME', 'JWT_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = parseInt(process.env.PORT) || 3000;
export const DATABASE_HOST = process.env.DATABASE_HOST;
export const DATABASE_NAME = process.env.DATABASE_NAME;
export const JWT_SECRET = process.env.JWT_SECRET;
```

### 9. Clase Server (`server.js`)

**Responsabilidades:**
- Configura Express con middlewares globales
- Registra rutas bajo `/api/v1`
- Maneja errores globales
- Configura timeout del servidor

**Estructura:**
```javascript
import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import mainRouter from './routes/index.js';
import i18nMiddleware from './middleware/i18n.js';
import bodyValidator from './middleware/body-validator.js';
import { PORT } from './config/environment.js';

class Server {
  constructor() {
    this.app = express();
    this.serverInstance = null;
  }

  initializeApp() {
    this.app.use(helmet());
    this.app.use(bodyParser.json());
    this.app.use(i18nMiddleware());
    this.app.use(bodyValidator);
    this.app.use('/api/v1', mainRouter);
    
    this.app.use((err, req, res, next) => {
    });
    
    return this.app;
  }

  start() {
    this.initializeApp();
    this.serverInstance = this.app.listen(PORT);
  }
}

export default Server;
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

**Nota sobre package.json:**
- Debe incluir `"type": "module"` para habilitar ES modules
- Ejemplo:
  ```json
  {
    "name": "proyecto-backend",
    "version": "1.0.0",
    "type": "module",
    ...
  }
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
- **Todo en inglés**: nombres de archivos, carpetas, variables, funciones
- **Rutas**: `app/[module]/[action]/route.js` (ej: `app/users/create/route.js`)
- **Modelos**: `models/[domain]/[model].js` (singular, ej: `models/users/user.js`)
- **Routers**: `routes/[module].js` (plural, ej: `routes/users.js`)
- **Middlewares**: `middleware/[name].js` o `middleware/[module]/[name].js`

### Estructura de Request/Response
- **Request body**: Siempre envuelto en `{ data: { ... } }`
- **Validaciones**: Usan el helper de validación con `'data.field'` (nombres en inglés)
- **Respuestas**: Usan el helper de respuestas estandarizado

### Manejo de errores
- **NO usar try-catch en controladores** - El wrapper captura todos los errores automáticamente
- Lanzar errores con `throw` y propiedades `status` y `code`
- Los códigos de error son claves de traducción en inglés (ej: `'resource.notFound'`)
- El sistema captura y formatea automáticamente en un punto centralizado

### Base de datos
- Usar transacciones para operaciones complejas
- Soft deletes con `paranoid: true` en modelos (opcional)
- Nombres de tablas y campos en inglés

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
2. **Usar ES modules** - `import/export` con `"type": "module"` en `package.json`
3. **Todo en inglés** - código, variables, funciones, archivos, carpetas, mensajes de error, nombres de tablas
4. **Comentarios mínimos** - solo cuando sea absolutamente necesario para lógica compleja o no obvia
5. **No incluir tests** (el usuario no los utilizará)
6. **Mantener la estructura modular** - cada módulo es independiente
7. **Usar helpers reutilizables** - helpers de respuesta, validación, wrapper de controladores
8. **Validación en dos niveles** - express-validator + validaciones de negocio
9. **Logging a archivos locales** - para debugging y monitoreo, con rotación de archivos
10. **Manejo centralizado de errores** - NO usar try-catch en controladores, el wrapper captura todo automáticamente
11. **Internacionalización desde el inicio** - códigos de error traducibles (en inglés)
12. **Seguridad por capas** - Helmet, validación, autenticación, autorización
13. **Adaptar nombres** - usar terminología apropiada para el dominio del negocio (en inglés)

## Ejemplo de Módulo Completo

Para un módulo de ejemplo (todo en inglés):

**1. Modelo** (`models/products/product.js`):
```javascript
export default (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, {
    tableName: 'products',
    paranoid: true,
  });

  Product.associate = function(models) {
  };

  return Product;
};
```

**2. Controlador** (`app/products/create/route.js`):
```javascript
import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import db from '../../../models/database.js';

const { Product } = db;

export const validators = [
  validateField('data.name').isLength({ min: 3 }).withMessage('validators.product.name'),
  validateField('data.price').isFloat({ min: 0 }).withMessage('validators.product.price'),
  validateRequest,
  authenticate,
];

export default async function handler(req, res, next) {
  const { data } = req.body;
  const product = await Product.create(data);
  return apiResponse(res, req, next)(product);
}
```

**3. Router** (`routes/products.js`):
```javascript
import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';

const router = Router();

registerRoute(router, '/create', await import('../app/products/create/route.js'));
registerRoute(router, '/list', await import('../app/products/list/route.js'));
registerRoute(router, '/update', await import('../app/products/update/route.js'));

export default router;
```

**4. Registro en router principal** (`routes/index.js`):
```javascript
import { Router } from 'express';
import Products from './products.js';

const mainRouter = Router();

mainRouter.use('/products', Products);

export default mainRouter;
```

---
