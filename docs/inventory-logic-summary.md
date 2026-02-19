# ¿Está correcta la lógica para un inventario completo?

Sí. La lógica implementada cubre un inventario completo con lotes, costos y trazabilidad. Resumen y puntos a tener en cuenta.

---

## Lo que está cubierto

| Requisito | Estado |
|-----------|--------|
| **Catálogo de productos** | Sí (inventory_products con precios, costo, IVA, stock mínimo). |
| **Stock por establecimiento** | Sí (inventory_stock; current_stock derivado de lotes). |
| **Toda entrada genera lote(s)** | Sí (uno automático o varios vía `batches`). |
| **Salida con FEFO** | Sí (First Expired, First Out por expiration_date). |
| **Transferencias** | Sí (FEFO en origen; en destino se crea lote con costo = costo del producto). |
| **Ajustes** | Sí (delta > 0 = entrada; delta < 0 = salida FEFO). |
| **Trazabilidad en kardex** | Sí (una línea por producto, batchDetail, cost_price, date_at). |
| **Costo en kardex** | Sí (entrada = lote/promedio; salida/transfer = costo del producto). |
| **Sincronización stock ↔ lotes** | Sí (current_stock = suma current_quantity de lotes). |
| **Reversión de movimientos** | Sí (update movimiento revierte lotes y kardex). |
| **Precio por establecimiento** | Sí (inventory_stock.price). |
| **Producto con/sin lotes (UI)** | Sí (`batch_active` en producto: ver abajo). |

---

## Diferenciar “control por lote” en la UI (`batchActive`)

Por detrás **todos** los productos usan lotes (al menos uno automático tipo S/N). Para el usuario podés diferenciar:

- **`batchActive === true`**  
  Control por lote activo. En el front: mostrar código de lote, vencimiento, listado de lotes; en entradas permitir `batches` o `batchCode`/fechas; en salidas permitir elegir lote o enviar `batchId`/`batches`.

- **`batchActive === false`** (valor por defecto)  
  Sin control por lote en la UI. En el front: solo cantidad; no mostrar campos ni listado de lotes. En movimientos enviar solo `quantity` (entrada) o salida sin `batchId` (FEFO). El backend crea/asigna el lote automático igual.

El campo está en **inventory_products**: `batch_active` (boolean). El usuario lo marca al crear/editar el producto (ej. checkbox “Control por lote”).

---

## Ajuste aplicado

- **Transferencia destino:** Antes el lote creado en destino tenía `unit_cost = 0`. Ahora se usa el costo del producto (`cost_price`), igual que en el kardex, para que la valorización por lotes sea coherente.

---

## Puntos a tener en cuenta (no errores de lógica)

1. **Stock existente sin lotes**  
   Si ya tenés `inventory_stock` con cantidades pero sin registros en `inventory_batches`, la primera salida fallaría (no hay lotes para FEFO). Solución: script único que cree lotes “iniciales” a partir del stock actual (un lote por producto/establecimiento con esa cantidad y costo del producto).

2. **Alertas de stock mínimo**  
   Los campos `min_stock_level` (producto y stock) están en el modelo; no hay job ni endpoint que envíe alertas. Eso se puede agregar aparte (cron + notificaciones o listado “bajo mínimo”).

3. **Valorización de inventario**  
   Para reportes de valorización podés usar: por establecimiento/producto, suma de `(batch.current_quantity * batch.unit_cost)`. Los datos ya están; el reporte es una consulta/endpoint.

4. **Eliminar / vaciar un lote**  
   Si un lote se “borra” (soft delete), deja de sumar en `syncInventoryStock`, por lo que el stock bajaría. Si necesitás anular lotes, suele ser mejor hacer un ajuste (salida) que borrar el lote.

5. **Concurrencia**  
   Los movimientos van en transacción; las actualizaciones de lotes y stock son atómicas. Con aislamiento habitual (p. ej. REPEATABLE READ) no deberías tener doble descuento en salidas simultáneas.

---

## Conclusión

La lógica es correcta para un inventario completo: entradas siempre generan lotes, salidas usan FEFO, transferencias y ajustes están alineados, el kardex lleva costo y detalle de lotes, y el stock se mantiene sincronizado con los lotes. El único cambio aplicado fue asignar el costo del producto al lote creado en destino en transferencias para que la valorización por lotes sea consistente.
