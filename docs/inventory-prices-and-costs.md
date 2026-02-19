# Precios y costos en inventario

Resumen de dónde se guarda cada cosa y cuándo se usa, para no mezclar **costo** con **precio de venta**.

---

## 1. Diferencia rápida

| Concepto | Uso |
|---------|-----|
| **Costo** | Lo que a vos te cuesta el producto (compra, producción). Se usa para kardex, valorización de stock, márgenes. |
| **Precio** | Lo que cobrás al vender. Puede ser general, por establecimiento, mínimo, etc. |

En el sistema están separados: costo en producto/lote/kardex; precios de venta en producto y en stock por establecimiento.

---

## 2. Dónde está cada cosa

### En el producto (`inventory_products`)

| Campo | Significado |
|-------|-------------|
| **cost_price** | Costo por defecto del producto. Se usa cuando no hay detalle por lote (ej. en kardex de salidas y transferencias). |
| **general_price** | Precio de venta “general”. Referencia para ventas. |
| **minimum_price** | Precio de venta mínimo (límite al vender). |
| **iva_type** | Tipo de IVA (0, 12, 15, etc.). |
| **min_stock_level** | Stock mínimo por defecto del producto. |

### Por establecimiento (`inventory_stock`)

| Campo | Significado |
|-------|-------------|
| **price** | Precio de venta de ese producto **en ese establecimiento**. Puede ser el mismo que `general_price` o distinto. |
| **current_stock** | Stock actual (sincronizado desde lotes). |
| **min_stock_level** | Stock mínimo en ese establecimiento. |

### Por lote (`inventory_batches`)

| Campo | Significado |
|-------|-------------|
| **unit_cost** | Costo por unidad de **esa** entrada/lote. Cada compra o ingreso puede tener otro costo; por eso se guarda en el lote. |

### En el kardex (`kardex`)

| Campo | Significado |
|-------|-------------|
| **cost_price** | Costo que se registra en **esa línea** del kardex (para reportes y valorización). Ver abajo cómo se calcula según el tipo de movimiento. |

---

## 3. Cómo se usa el costo en el kardex

| Tipo de movimiento | De dónde sale el `cost_price` del kardex |
|--------------------|------------------------------------------|
| **Entrada** (entry) | Del **lote**: si es un lote, su `unit_cost`; si son varios lotes (array `batches`), **promedio ponderado** de los `unit_cost` de esos lotes. |
| **Salida** (exit) | Del **producto**: `inventory_products.cost_price` (costo por defecto). |
| **Transferencia** (origen y destino) | Del **producto**: `inventory_products.cost_price` (por defecto). |
| **Ajuste** (entrada/salida) | Mismo criterio: entrada = lote(s), salida = producto. |

Resumen:  
- **Entradas** → costo que realmente ingresó (lote o detalle `batches`).  
- **Salidas y transferencias** → costo por defecto del producto (no se desglosa por lote en el kardex).

---

## 4. Flujo recomendado para no marearse

1. **Alta/edición de producto**  
   - Definir: `cost_price` (costo por defecto), `general_price`, `minimum_price`, `iva_type`.

2. **Al dar de alta stock en un establecimiento**  
   - Opcional: setear `inventory_stock.price` (ej. igual a `general_price` la primera vez).

3. **En cada entrada (movimiento tipo entry)**  
   - Si usás **un lote**: mandar `unitCost` (o que quede el del lote). Ese valor va a `inventory_batches.unit_cost` y al kardex.  
   - Si usás **varios lotes** (`batches`): en cada elemento de `batches` mandar `unitCost`; en el kardex se guarda el promedio ponderado.

4. **Salidas y transferencias**  
   - No mandás costo; el sistema toma `inventory_products.cost_price` para el kardex.

5. **Ventas (en tu módulo de ventas)**  
   - Usar `inventory_stock.price` (precio en ese establecimiento) o las reglas que tengas (general_price, mínimo, etc.), **no** el costo.

---

## 5. Resumen en una frase

- **Costo** = producto (`cost_price`), lotes (`unit_cost`) y kardex (`cost_price` por línea).  
- **Precio** = producto (`general_price`, `minimum_price`) y establecimiento (`inventory_stock.price`).  
- Entradas registran el costo real del lote; salidas y transferencias usan el costo por defecto del producto.

Si querés, en el siguiente paso podemos bajar esto a “cómo llenar cada campo en la UI” o a un ejemplo numérico (una entrada, una salida, un reporte de valorización).
