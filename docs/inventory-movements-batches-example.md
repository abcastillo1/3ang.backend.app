# Movimientos con detalle de lotes (`batches`) por producto

En un movimiento de tipo **adjustment** con ítems de tipo **entry**, cada ítem puede incluir un array `batches` para definir cómo se reparte la cantidad entrante en uno o más lotes.

## Ejemplo: entrada con varios lotes

Entrada de **100 unidades** del producto 5 repartidas en **2 lotes** con distintos códigos, fechas y costos:

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "dateAt": "2025-02-20",
    "description": "Ingreso con detalle por lote",
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
            "manufacturingDate": "2025-02-01",
            "expirationDate": "2026-02-01",
            "unitCost": 2.80
          }
        ]
      }
    ]
  }
}
```

- **quantity** del ítem (100) debe ser igual a la **suma** de los `quantity` de `batches` (60 + 40).
- Por cada elemento en `batches` se crea un lote con:
  - **quantity** (obligatorio)
  - **batchCode** (opcional; si no se envía, se usa `"S/N"`)
  - **manufacturingDate** (opcional; formato YYYY-MM-DD)
  - **expirationDate** (opcional; si no se envía, se usa +10 años)
  - **unitCost** (opcional; default 0)

En el kardex se genera **una sola línea** para ese ítem, con `batchDetail` con los lotes creados y un costo promedio ponderado para `cost_price`.

## Ejemplo: un solo lote con datos

Para **un solo lote** podés usar cualquiera de las dos formas:

**Opción A – Datos en el ítem** (sin array `batches`):

```json
{
  "productId": 5,
  "type": "entry",
  "quantity": 50,
  "batchCode": "LOTE-SIMPLE",
  "expirationDate": "2026-06-30",
  "unitCost": 2.00
}
```

**Opción B – Mismo formato que varios: `batches` con un solo elemento** (misma estructura que cuando tenés varios lotes):

```json
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
```

En ambos casos se crea un lote. Si querés **sumar a un lote ya existente**, usá `batchId` en el ítem (sin `batches`).

## Ejemplo: producto sin datos de lote (el backend asigna uno)

Si **no** enviás `batches` ni `batchId` ni `batchCode`/fechas/costo, solo `productId`, `type: "entry"` y `quantity`, el backend crea **un lote automático** para ese ítem (código `"S/N"`, fecha de vencimiento por defecto, costo 0). Ideal para productos que no manejás por lote.

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "description": "Ingreso de productos sin detalle de lote",
    "items": [
      {
        "productId": 3,
        "type": "entry",
        "quantity": 200
      },
      {
        "productId": 8,
        "type": "entry",
        "quantity": 50
      }
    ]
  }
}
```

Por detrás se crea un lote por cada ítem (batchCode `"S/N"`, expirationDate por defecto, unitCost 0). El kardex y el stock quedan correctos.

## Ejemplo: movimiento mixto (con lotes y sin lotes)

En un mismo movimiento podés mezclar: ítems con `batches` (o con datos de lote), e ítems sin nada de lote (solo cantidad). El backend asigna lote automático solo a los que no envían lotes.

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "dateAt": "2025-02-20",
    "description": "Ingreso mixto: medicamento por lote + insumos sin lote",
    "items": [
      {
        "productId": 5,
        "type": "entry",
        "quantity": 100,
        "batches": [
          {
            "quantity": 60,
            "batchCode": "LOTE-2025-001",
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
      },
      {
        "productId": 12,
        "type": "entry",
        "quantity": 500
      },
      {
        "productId": 7,
        "type": "entry",
        "quantity": 30,
        "batchCode": "LOTE-SIMPLE",
        "unitCost": 1.00
      }
    ]
  }
}
```

- **Producto 5:** entrada con 2 lotes explícitos (batches).
- **Producto 12:** entrada sin datos de lote → el backend asigna un lote automático (S/N).
- **Producto 7:** entrada con un solo lote definido en el ítem (batchCode, unitCost); no usás array `batches`.

## Resumen

| Campo en cada elemento de `batches` | Obligatorio | Descripción |
|-------------------------------------|-------------|-------------|
| quantity                            | Sí          | Cantidad que entra en ese lote |
| batchCode                           | No          | Código del lote (default "S/N") |
| manufacturingDate                   | No          | Fecha fabricación (YYYY-MM-DD) |
| expirationDate                      | No          | Fecha vencimiento (default +10 años) |
| unitCost                            | No          | Costo por unidad del lote (default 0) |

Si envías `batches`, **no** uses `batchId` en el mismo ítem (son alternativas: o sumas a un lote existente con `batchId`, o defines nuevos lotes con `batches`).

---

## Salidas (exit)

En una salida solo enviás **productId**, **type: "exit"** y **quantity**. Opcionalmente **batchId** y **reason**.

### Salida sin `batchId` (FEFO)

Si **no** enviás `batchId`, el backend descuenta por **FEFO** (First Expired, First Out): primero del lote que vence antes, y si no alcanza sigue con el siguiente. Sirve tanto para productos con varios lotes como para productos con un solo lote (o lote automático S/N).

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "description": "Salida por venta / uso",
    "items": [
      {
        "productId": 5,
        "type": "exit",
        "quantity": 25,
        "reason": "Venta"
      },
      {
        "productId": 12,
        "type": "exit",
        "quantity": 100
      }
    ]
  }
}
```

- **Producto 5:** se descuentan 25 unidades desde los lotes disponibles (FEFO).  
- **Producto 12:** se descuentan 100 (si tiene un solo lote, sale todo de ese; si tiene varios, FEFO).

### Salida con `batchId` (de un lote concreto)

Si enviás **batchId**, se descuenta **solo** de ese lote. Se usa para:
- **Vaciar / “eliminar” lote:** quantity = cantidad de ese lote.
- **Ajustar restando:** quantity = lo que querés restar de ese lote.

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "description": "Salida desde lote 7",
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

- **quantity** debe ser ≤ cantidad actual del lote.  
- El lote 7 se reduce en 30; si 30 es todo lo que tenía, el lote queda en 0.

### Salida con `batches` (varios lotes en un ítem, igual que entrada)

Igual que en **entrada**, podés usar un array **`batches`** en un solo ítem de salida. En exit cada elemento tiene **`batchId`** y **`quantity`** (cuánto sacar de ese lote). La **quantity** del ítem debe ser la **suma** de las quantity de `batches`. Así entrada y salida son simétricos: un ítem, un producto, varios lotes.

Ejemplo: producto 5; salida de 20 del lote 7, 15 del lote 9 y 10 del lote 12 (total 45).

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "description": "Salida desde varios lotes del producto 5",
    "items": [
      {
        "productId": 5,
        "type": "exit",
        "quantity": 45,
        "reason": "Venta / uso por lote",
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

- **quantity** del ítem (45) = suma de las quantity en `batches` (20 + 15 + 10).
- Cada elemento de `batches`: **batchId** (id del lote) y **quantity** (a sacar de ese lote). Debe ser ≤ cantidad actual del lote.
- Se genera **una sola línea** de kardex para ese ítem, con `batchDetail` con los tres lotes.

### Salida desde varios lotes: dos formas

Para sacar de **varios lotes del mismo producto** tenés dos opciones (el resultado es el mismo):

1. **Un ítem con `batches`** (recomendado, simétrico con entrada): un solo ítem con `batches: [{ batchId, quantity }, ...]` como en el ejemplo anterior.
2. **Varios ítems, uno por lote**: un ítem por cada lote, cada uno con `batchId` y `quantity` (formato anterior).

### Resumen salidas

| Envío                 | Comportamiento |
|-----------------------|----------------|
| Sin `batchId` ni `batches` | FEFO: descuenta de lotes por vencimiento. |
| Con `batchId`         | Descuenta solo de ese lote (un lote por ítem). |
| Con `batches` (array) | Descuenta de cada lote indicado; cada elemento `{ batchId, quantity }`. Igual estructura que entrada. |

### Movimiento con entrada y salida (en el mismo movimiento)

Un mismo movimiento puede tener ítems de **entry** e **exit**. Cada ítem se procesa en orden; el backend actualiza stock y kardex por cada uno.

**Ejemplo 1 – Entrada + salida FEFO (sin lote específico en la salida):**

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "dateAt": "2025-02-20",
    "description": "Ingreso producto 5 y salida de producto 12",
    "items": [
      {
        "productId": 5,
        "type": "entry",
        "quantity": 80,
        "batches": [
          {
            "quantity": 80,
            "batchCode": "LOTE-2025-003",
            "expirationDate": "2026-03-01",
            "unitCost": 2.20
          }
        ]
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

- **Ítem 1:** entrada de 80 unidades del producto 5 en un lote.
- **Ítem 2:** salida de 50 unidades del producto 12 (FEFO; el backend elige lotes por vencimiento).

**Ejemplo 2 – Entrada + salida de un lote específico (`batchId` en la salida):**

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "dateAt": "2025-02-20",
    "description": "Ingreso producto 3 y baja del lote 7 (producto 5)",
    "items": [
      {
        "productId": 3,
        "type": "entry",
        "quantity": 200
      },
      {
        "productId": 5,
        "type": "exit",
        "quantity": 30,
        "batchId": 7,
        "reason": "Vaciar lote 7"
      }
    ]
  }
}
```

- **Ítem 1:** entrada de 200 unidades del producto 3 (sin lotes; el backend asigna lote S/N).
- **Ítem 2:** salida de 30 unidades del producto 5 **solo del lote id 7** (vaciar o ajustar ese lote).

---

## Vaciar o "eliminar" un lote (salida desde un lote específico)

En lugar de borrar el registro del lote, se hace una **salida** indicando de qué lote se descuenta. Así el lote queda en 0 y queda trazabilidad en el kardex.

Ejemplo: vaciar el lote id 7 (que tiene 30 unidades).

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "description": "Vaciar lote (eliminar lote)",
    "items": [
      {
        "productId": 5,
        "type": "exit",
        "quantity": 30,
        "batchId": 7,
        "reason": "Baja de lote / eliminación"
      }
    ]
  }
}
```

- **batchId**: id del lote del cual descontar (para tipo `exit`). Mismo campo que en entrada: en entry = sumar a ese lote; en exit = restar de ese lote. Si no se envía en exit, se aplica FEFO.
- **quantity**: debe ser ≤ current_quantity de ese lote.

---

## Resumen: eliminar lote vs editar lote (qué movimiento usar)

En el módulo de inventario todo debe quedar trazado. Así se hace bien:

### 1. Eliminar / vaciar un lote

**Objetivo:** que el lote quede en 0 y quede registrado en el kardex.

**Movimiento:** una **salida (exit)** de ese producto, con:

- `batchId` = id del lote a vaciar  
- `quantity` = `current_quantity` de ese lote (o menos si solo querés bajar parte)  
- `reason` opcional: ej. "Baja de lote", "Eliminación de lote"

El backend descuenta solo de ese lote (gracias a `batchId`), el lote queda en 0 y el kardex tiene una línea de salida con `batchDetail` de ese lote. No se borra el registro del lote; en listados podés filtrar por `current_quantity > 0` si no querés mostrar lotes vacíos.

### 2. Editar un lote (código, fechas, costo)

**Objetivo:** cambiar datos del lote (batch_code, manufacturing_date, expiration_date, unit_cost). La cantidad no se toca por aquí.

**No es un movimiento:** es actualizar el registro del lote (endpoint tipo PATCH del lote: actualizar `inventory_batches` por id). La cantidad solo cambia con entradas/salidas.

### 3. Ajustar la cantidad de un lote (corregir error)

**Objetivo:** sumar o restar unidades en un lote concreto.

- **Sumar:** movimiento **entrada (entry)** con `batchId` = ese lote y `quantity` = lo que sumás.  
- **Restar:** movimiento **salida (exit)** con `batchId` = ese lote y `quantity` = lo que restás.

Así siempre hay trazabilidad en el kardex y los totales por lote quedan bien.

---

## Ejemplo: ajustar cantidad de un lote

Supongamos que el **producto 5** tiene el **lote id 12** con 50 unidades. Descubrís que en realidad entraron 10 más (conteo mal) o que sobraron 8 (había que restar).

**Sumar 10 unidades al lote 12** (entrada con `batchId`):

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "description": "Ajuste: sumar 10 al lote 12 (conteo corregido)",
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

- No enviás `batches`; enviás **`batchId`: 12** (id del lote en `inventory_batches`).
- El backend suma 10 a `current_quantity` del lote 12 y registra una línea de entrada en el kardex.

**Restar 8 unidades del lote 12** (salida con `batchId`):

```json
{
  "data": {
    "establishmentId": 1,
    "type": "adjustment",
    "description": "Ajuste: restar 8 del lote 12",
    "items": [
      {
        "productId": 5,
        "type": "exit",
        "quantity": 8,
        "batchId": 12,
        "reason": "Corrección por conteo"
      }
    ]
  }
}
```

- **`batchId`: 12** indica que las 8 unidades se descuentan del lote 12 (no FEFO).
- `quantity` debe ser ≤ cantidad actual del lote (ej. 50).

Resumen: **`batchId`** se usa en ambos: en **entry** = id del lote al que sumás; en **exit** = id del lote del que restás. Si no enviás `batchId` en una salida, se aplica FEFO. Ese id es el que devuelve la API al listar lotes del producto/establecimiento.
