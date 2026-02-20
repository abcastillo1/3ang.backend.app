# Guía de consumo del API de inventario – lotes y cambios

Este documento describe cómo consumir las APIs actualizadas del módulo de inventario: lotes, precios, `batchActive` y respuestas mapeadas.

---

## 1. Productos

### 1.1 Crear producto (`inventory/products/create`)

**Request (POST)**

```json
{
  "data": {
    "name": "Paracetamol 500mg",
    "unitOfMeasure": "unidad",
    "sku": "PARA-500",
    "description": "Analgésico",
    "categoryId": 1,
    "generalPrice": 2.50,
    "costPrice": 1.20,
    "ivaType": "12",
    "minimumPrice": 2.00,
    "minStockLevel": 50,
    "batchActive": true,
    "isActive": true
  }
}
```

| Campo           | Obligatorio | Descripción                                           |
|-----------------|-------------|-------------------------------------------------------|
| name            | Sí          | Nombre del producto                                  |
| unitOfMeasure   | Sí          | Unidad de medida (unidad, caja, kg, etc.)            |
| sku             | No          | Código del producto                                  |
| description     | No          | Descripción                                          |
| categoryId      | No          | ID de categoría                                      |
| generalPrice    | No          | Precio de venta general                              |
| costPrice       | No          | Costo del producto                                   |
| ivaType         | No          | Tipo IVA (0, 12, 15, etc.)                           |
| minimumPrice    | No          | Precio mínimo de venta                               |
| minStockLevel   | No          | Stock mínimo por defecto                             |
| batchActive     | No          | Si maneja lotes (default: false)                     |
| isActive        | No          | Activo (default: true)                               |

**Response (200)**

```json
{
  "success": true,
  "data": {
    "product": {
      "id": 5,
      "organizationId": 1,
      "name": "Paracetamol 500mg",
      "sku": "PARA-500",
      "description": "Analgésico",
      "image": null,
      "gallery": null,
      "unitOfMeasure": "unidad",
      "generalPrice": 2.5,
      "costPrice": 1.2,
      "ivaType": "12",
      "minimumPrice": 2,
      "minStockLevel": 50,
      "batchActive": true,
      "isActive": true,
      "createdAt": "2025-02-20T10:00:00.000Z",
      "updatedAt": "2025-02-20T10:00:00.000Z",
      "category": { "id": 1, "name": "Medicamentos", "description": null }
    }
  }
}
```

---

### 1.2 Editar producto (`inventory/products/update`)

**Request (POST)**

Todos los campos son opcionales excepto `id`. Solo se actualizan los que se envían.

```json
{
  "data": {
    "id": 5,
    "name": "Paracetamol 500mg Actualizado",
    "sku": "PARA-500",
    "description": "Analgésico actualizado",
    "categoryId": 1,
    "generalPrice": 2.80,
    "costPrice": 1.25,
    "ivaType": "12",
    "minimumPrice": 2.20,
    "minStockLevel": 60,
    "batchActive": true,
    "isActive": true
  }
}
```

| Campo           | Obligatorio | Descripción                                        |
|-----------------|-------------|----------------------------------------------------|
| id              | Sí          | ID del producto a editar                           |
| name            | No          | Nombre                                             |
| unitOfMeasure   | No          | Unidad de medida                                   |
| sku             | No          | Código                                             |
| description     | No          | Descripción                                        |
| categoryId      | No          | ID de categoría (null para quitar)                 |
| generalPrice    | No          | Precio de venta general                            |
| costPrice       | No          | Costo                                              |
| ivaType         | No          | Tipo IVA                                           |
| minimumPrice    | No          | Precio mínimo                                      |
| minStockLevel   | No          | Stock mínimo                                       |
| batchActive     | No          | Si maneja lotes                                    |
| isActive        | No          | Activo                                             |
| image           | No          | Imagen (formato de files/upload)                   |
| gallery         | No          | Galería (array de archivos subidos)                |

**Response (200)**

```json
{
  "success": true,
  "data": {
    "product": {
      "id": 5,
      "organizationId": 1,
      "name": "Paracetamol 500mg Actualizado",
      "sku": "PARA-500",
      "description": "Analgésico actualizado",
      "image": null,
      "gallery": null,
      "unitOfMeasure": "unidad",
      "generalPrice": 2.8,
      "costPrice": 1.25,
      "ivaType": "12",
      "minimumPrice": 2.2,
      "minStockLevel": 60,
      "batchActive": true,
      "isActive": true,
      "createdAt": "2025-02-20T10:00:00.000Z",
      "updatedAt": "2025-02-20T12:30:00.000Z",
      "category": { "id": 1, "name": "Medicamentos", "description": null }
    }
  }
}
```

**Permiso requerido:** `inventory.products.update`

---

### 1.3 Ver producto (`inventory/products/view`)

**Request (POST)**

Solo producto:

```json
{ "data": { "id": 5 } }
```

Producto con lotes por establecimiento:

```json
{ "data": { "id": 5, "establishmentId": 1 } }
```

**Response (200) – sin `establishmentId`**

```json
{
  "success": true,
  "data": {
    "product": {
      "id": 5,
      "organizationId": 1,
      "name": "Paracetamol 500mg",
      "sku": "PARA-500",
      "description": "Analgésico",
      "image": null,
      "gallery": null,
      "unitOfMeasure": "unidad",
      "generalPrice": 2.5,
      "costPrice": 1.2,
      "ivaType": "12",
      "minimumPrice": 2,
      "minStockLevel": 50,
      "batchActive": true,
      "isActive": true,
      "createdAt": "2025-02-20T10:00:00.000Z",
      "updatedAt": "2025-02-20T10:00:00.000Z",
      "category": { "id": 1, "name": "Medicamentos", "description": null }
    }
  }
}
```

**Response (200) – con `establishmentId`** (incluye `batches`)

```json
{
  "success": true,
  "data": {
    "product": {
      "id": 5,
      "organizationId": 1,
      "name": "Paracetamol 500mg",
      "sku": "PARA-500",
      "description": "Analgésico",
      "image": null,
      "gallery": null,
      "unitOfMeasure": "unidad",
      "generalPrice": 2.5,
      "costPrice": 1.2,
      "ivaType": "12",
      "minimumPrice": 2,
      "minStockLevel": 50,
      "batchActive": true,
      "isActive": true,
      "createdAt": "2025-02-20T10:00:00.000Z",
      "updatedAt": "2025-02-20T10:00:00.000Z",
      "category": { "id": 1, "name": "Medicamentos", "description": null },
      "batches": [
        {
          "id": 7,
          "batchCode": "LOTE-2025-001",
          "currentQuantity": 60,
          "unitCost": 1.2,
          "manufacturingDate": "2025-01-15",
          "expirationDate": "2026-01-15",
          "registrationDate": "2025-02-01T08:00:00.000Z"
        },
        {
          "id": 9,
          "batchCode": "LOTE-2025-002",
          "currentQuantity": 40,
          "unitCost": 1.25,
          "manufacturingDate": "2025-02-01",
          "expirationDate": "2026-02-01",
          "registrationDate": "2025-02-10T10:00:00.000Z"
        }
      ]
    }
  }
}
```

---

### 1.4 Listar productos (`inventory/products/list`)

**Request (POST)**

```json
{
  "data": {
    "page": 1,
    "limit": 20,
    "search": "paracetamol",
    "categoryId": 1,
    "isActive": true
  }
}
```

**Response (200)**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 5,
        "organizationId": 1,
        "name": "Paracetamol 500mg",
        "sku": "PARA-500",
        "description": "Analgésico",
        "image": null,
        "gallery": null,
        "unitOfMeasure": "unidad",
        "generalPrice": 2.5,
        "costPrice": 1.2,
        "ivaType": "12",
        "minimumPrice": 2,
        "minStockLevel": 50,
        "batchActive": true,
        "isActive": true,
        "createdAt": "2025-02-20T10:00:00.000Z",
        "updatedAt": "2025-02-20T10:00:00.000Z",
        "category": { "id": 1, "name": "Medicamentos", "description": null }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

---

## 2. Stock por establecimiento (`inventory/stock/list`)

**Request (POST)**

```json
{
  "data": {
    "establishmentId": 1,
    "page": 1,
    "limit": 20,
    "search": "paracetamol"
  }
}
```

**Response (200)**

```json
{
  "success": true,
  "data": {
    "establishment": { "id": 1, "name": "Sucursal Centro", "code": "SC-001" },
    "items": [
      {
        "productId": 5,
        "productName": "Paracetamol 500mg",
        "sku": "PARA-500",
        "unitOfMeasure": "unidad",
        "price": 2.5,
        "generalPrice": 2.5,
        "costPrice": 1.2,
        "ivaType": "12",
        "minimumPrice": 2,
        "batchActive": true,
        "currentStock": 100,
        "minStockLevel": 50,
        "category": { "id": 1, "name": "Medicamentos" }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

| Campo       | Descripción                                  |
|------------|----------------------------------------------|
| price      | Precio del producto en ese establecimiento   |
| generalPrice | Precio general del producto                |
| costPrice  | Costo del producto                           |
| batchActive | Si el producto tiene control por lotes      |
| currentStock | Stock actual en el establecimiento         |

---

## 3. Movimientos con lotes

### 3.1 Entrada – varios lotes (`batches`)

**Request (POST `inventory/movements/create`)**

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "dateAt": "2025-02-20",
    "description": "Ingreso con lotes",
    "items": [
      {
        "productId": 5,
        "type": "entry",
        "quantity": 100,
        "batches": [
          {
            "quantity": 60,
            "batchCode": "LOTE-2025-001",
            "manufacturingDate": "2025-01-15",
            "expirationDate": "2026-01-15",
            "unitCost": 2.50
          },
          {
            "quantity": 40,
            "batchCode": "LOTE-2025-002",
            "expirationDate": "2026-02-01",
            "unitCost": 2.80
          }
        ]
      }
    ]
  }
}
```

Regla: `quantity` del ítem = suma de `quantity` en `batches`.

---

### 3.2 Entrada – un solo lote (con `batches` o sin)

**Opción A – Con array `batches` de un elemento**

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      {
        "productId": 5,
        "type": "entry",
        "quantity": 50,
        "batches": [
          {
            "quantity": 50,
            "batchCode": "LOTE-SIMPLE",
            "expirationDate": "2026-06-30",
            "unitCost": 2.00
          }
        ]
      }
    ]
  }
}
```

**Opción B – Datos en el ítem (sin `batches`)**

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      {
        "productId": 5,
        "type": "entry",
        "quantity": 50,
        "batchCode": "LOTE-SIMPLE",
        "expirationDate": "2026-06-30",
        "unitCost": 2.00
      }
    ]
  }
}
```

---

### 3.3 Entrada – sin datos de lote (backend crea lote S/N)

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      { "productId": 3, "type": "entry", "quantity": 200 },
      { "productId": 8, "type": "entry", "quantity": 50 }
    ]
  }
}
```

---

### 3.4 Entrada – sumar a un lote existente (`batchId`)

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      {
        "productId": 5,
        "type": "entry",
        "quantity": 10,
        "batchId": 12
      }
    ]
  }
}
```

`batchId` = id del lote en `inventory_batches` (se obtiene de `products/view` con `establishmentId` o del listado de lotes).

---

### 3.5 Salida – FEFO (sin especificar lote)

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      { "productId": 5, "type": "exit", "quantity": 25, "reason": "Venta" }
    ]
  }
}
```

El backend descuenta por FEFO.

---

### 3.6 Salida – de un lote específico (`batchId`)

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      {
        "productId": 5,
        "type": "exit",
        "quantity": 30,
        "batchId": 7,
        "reason": "Baja de lote"
      }
    ]
  }
}
```

---

### 3.7 Salida – varios lotes en un ítem (`batches`)

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      {
        "productId": 5,
        "type": "exit",
        "quantity": 45,
        "reason": "Venta por lote",
        "batches": [
          { "batchId": 7, "quantity": 20 },
          { "batchId": 9, "quantity": 15 },
          { "batchId": 12, "quantity": 10 }
        ]
      }
    ]
  }
}
```

`quantity` del ítem = suma de `quantity` en `batches`.

---

### 3.8 Movimiento mixto (entrada + salida)

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "items": [
      {
        "productId": 5,
        "type": "entry",
        "quantity": 80,
        "batches": [{ "quantity": 80, "batchCode": "LOTE-003", "unitCost": 2.20 }]
      },
      {
        "productId": 12,
        "type": "exit",
        "quantity": 50,
        "reason": "Uso interno"
      }
    ]
  }
}
```

---

## 4. Resumen de campos por tipo de ítem

### Entrada (entry)

| Campo       | Uso                                                                 |
|------------|---------------------------------------------------------------------|
| productId  | Obligatorio                                                         |
| type       | `"entry"`                                                           |
| quantity   | Obligatorio; debe coincidir con la suma de `batches` si usás `batches` |
| batches    | Array de `{ quantity, batchCode?, manufacturingDate?, expirationDate?, unitCost? }` |
| batchId    | Para sumar a un lote existente; excluyente con `batches`            |
| batchCode, manufacturingDate, expirationDate, unitCost | Datos de un solo lote (sin `batches`) |

### Salida (exit)

| Campo     | Uso                                                                 |
|-----------|---------------------------------------------------------------------|
| productId | Obligatorio                                                         |
| type      | `"exit"`                                                            |
| quantity  | Obligatorio; debe coincidir con la suma de `batches` si usás `batches` |
| batches   | Array de `{ batchId, quantity }`                                    |
| batchId   | Para restar de un solo lote; excluyente con `batches`               |
| reason    | Opcional                                                            |

---

## 5. Uso de `batchActive` en el frontend

- **`batchActive: true`**  
  Mostrar campos de lote (código, vencimiento), listado de lotes y permitir envío de `batches` o `batchId` en movimientos.

- **`batchActive: false`**  
  Mostrar solo cantidad; no pedir datos de lote. En movimientos enviar solo `quantity` (entrada o salida FEFO). El backend sigue creando un lote S/N.

---

## 6. Cómo obtener IDs de lotes

1. **products/view** con `establishmentId`: el producto incluye `batches` con el `id` de cada lote.
2. API de lotes (si existe): listar lotes por producto/establecimiento.
3. Respuesta de movimientos: los ítems de kardex suelen incluir `batchDetail` con `batchId`.
