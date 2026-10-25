# REGISTRO-M — Registro Ágil de Ventas en Campo para Emprendimientos

Aplicación web **Mobile-First**, autónoma y de alto rendimiento, diseñada para personal operativo en movimiento que realiza visitas comerciales y registro de ventas físicas en campo.

---

## 🚀 Principios de Producto y Filosofía de Diseño

- **Enfoque UX:** Mínimo esfuerzo cognitivo y físico. Inspirado en la simplicidad directa de *Google Forms* con la fluidez y estética minimalista de *Uber*.
- **Paleta y Alto Contraste:**
  - `#000000` (Uber Black): Acciones principales, estados activos y jerarquía tipográfica.
  - `#FFFFFF`: Fondo de tarjetas y contenedores.
  - `#F6F6F6`: Fondo neutral de la aplicación (resistente a reflejos bajo luz solar directa).
  - `#E2E2E2`: Bordes y divisores neutros.
  - `#05944F` (Verde Esmeralda): **Exclusivo** para confirmación de ventas, checkmark animado y estados de éxito.
- **Accesibilidad y Ergonomía (WCAG 2.2 AA):**
  - Targets táctiles mínimos de **48×48 px** en todos los botones, selectores y casillas.
  - Tipografía Inter (base >= 16px) que evita zoom automático indeseado en Safari/iOS.
  - Optimizado para uso con una sola mano en pantallas móviles (360px a 430px).
  - **Barra de acción fija inferior** al alcance directo del pulgar.

---

## 📱 Flujo Principal: Stepper de 1 Acción por Pantalla

1. **Paso 1 — Elegir Emprendimiento:**
   - Buscador en tiempo real por nombre, categoría o dirección.
   - Filtros rápidos por chips: *Todos*, *Ropa Local*, *Artesanías*, *Libros/Papelería*.
   - **Priorización Dinámica:** Ordena prioritariamente en la parte superior los comercios visitados recientemente por el usuario activo con el badge `⭐ Visitado recientemente`.
   - Selección táctil clara con borde negro sólido y activación del botón inferior fijo `"Continuar →"`.

2. **Paso 2 — Cantidades y Método de Pago por Producto:**
   - Encabezado contextual con el comercio activo y botón `[ ← Cambiar ]`.
   - Listado visible y directo de los 10 productos asignados al comercio con código opcional y precio unitario en Pesos Colombianos ($ COP).
   - Controles táctiles grandes `[ − ]` y `[ + ]` (48×48 px) y campo numérico editable (`inputmode="numeric"`).
   - **Comportamiento Contextual de Pago:**
     - Al seleccionar `unidades > 0`, se despliega suavemente de forma contextual el selector: `[ 💵 Efectivo ]` (predeterminado) o `[ 💳 Tarjeta ]`.
     - Si la cantidad vuelve a `0`, el selector se repliega limpiamente.
   - Barra inferior fija con total acumulado ($ COP), contador de unidades y botón `"Verificar →"`.

3. **Paso 3 — Verificación de Compra:**
   - Resumen limpio únicamente de los productos con unidades registradas.
   - Detalle de cada ítem: unidades, precio unitario, subtotal y badge indicativo `[💵 Efectivo]` o `[💳 Tarjeta]`.
   - **Cuadro Comparativo de Subtotales:** `Total Efectivo` vs `Total Tarjeta`.
   - `Total General de la Visita` destacado.
   - Botón `"Registrar Ventas"`.

4. **Paso 4 — Confirmación Emocional y Animada:**
   - Icono circular con checkmark animado en Verde Uber (`#05944F`).
   - Mensaje emocional e inspirador rotativo que resalta el impacto socioeconómico en las familias emprendedoras locales.
   - Ficha resumen con N° de visita (`VIS-XXXX`), fecha y hora en zona horaria `America/Bogota` (UTC-5), unidades y totales.
   - Badge de sincronización: `✓ Sincronizado en Google Sheets` o `⏳ Guardado localmente (Cola offline)`.
   - **Dos opciones de continuación:**
     - `"Registrar otra venta en este mismo emprendimiento"` (reinicia cantidades pero conserva el comercio en el Paso 2).
     - `"Elegir otro emprendimiento"` (reinicio completo al Paso 1).

---

## 👥 Cuentas y Roles Precargados

La pantalla de acceso cuenta con autenticación por correo y botones de acceso rápido de 1 toque:

| Usuario | Correo | Rol |
|---|---|---|
| **Melissa Restrepo** | `melissa@campo.co` | Operativo |
| **Jennifer Gómez** | `jennifer@campo.co` | Operativo |
| **Tatiana Morales** | `tatiana@campo.co` | Operativo |
| **Carlos Peñaloza** | `carlos@campo.co` | Operativo |
| **Administrador** | `admin@campo.co` | Administrador |

---

## 📋 Pantallas Complementarias

### Mis Registros (Historial del Operativo)
- Lista cronológica inversa de visitas confirmadas del usuario autenticado.
- Búsqueda y filtrado por nombre de comercio o fecha.
- Desglose expandible por producto con método de pago.
- **Control de Edición Rápida:** Permite corregir unidades o métodos de pago directamente si hubo un error en campo, recalculando totales y actualizando la cola de sincronización.

### Panel de Administración (Exclusivo rol 'admin')
- **Sub-pestaña Ventas:** Métricas globales (Ingresos totales, Unidades vendidas, Ventas en Efectivo vs Tarjeta, Visitas realizadas). Filtros por vendedor, comercio y auditoría.
- **Exportación Nativa:**
  - `[ 📥 Descargar Excel (.xlsx) ]`: Generado vía SheetJS en una hoja obligatoria llamada `Ventas`.
  - `[ 📄 Descargar CSV ]`: Respaldo plano con codificación UTF-8 y BOM.
  - Columnas oficiales: `ID de registro`, `Fecha`, `Hora`, `Usuario`, `Comercio`, `Producto`, `Unidades vendidas`, `Precio unitario`, `Valor total`, `Método de pago`.
- **Sub-pestaña Emprendimientos:** Creación/edición de comercios y **Matriz de Productos Habilitados** mediante checkboxes para personalizar el catálogo de cada emprendimiento.
- **Sub-pestaña Productos:** Creación, edición de precios en $ COP y activación/desactivación en catálogo.
- **Sub-pestaña Configuración & Google Sheets:**
  - Configuración de webhook Google Apps Script (`https://script.google.com/macros/s/.../exec`).
  - Botón de prueba de conexión (`PING`).
  - Código Google Apps Script listo para copiar con 1 toque con soporte de `LockService` para prevenir duplicados.
  - Gestión de roles de usuario.
  - Configuración de persistencia dual Firebase Firestore con fallback automático a LocalStorage.

---

## 🌐 Arquitectura Offline-First y Tolerancia a Fallos

- **Persistencia Dual Instantánea:**
  - Utiliza `localStorage` reactivo para tiempos de carga inferiores a 0.2 segundos (muy por debajo del límite de 1.5s).
  - Soporta configuración nativa de Firebase Firestore si se configuran las credenciales en la pestaña de administración.
- **Detección Automática de Red:**
  - Si el dispositivo pierde conectividad, se activa una barra de aviso amarilla: *"Modo sin conexión: Las ventas se guardan localmente y se sincronizarán al recuperar la red"*.
  - Las ventas se encolan en `pendingQueue`.
  - Cuando se restablece la conexión (`online`), el sistema reintenta la sincronización en segundo plano de forma automática o mediante el botón `"Sincronizar ahora"`.

---

## 📊 Código Google Apps Script para Google Sheets

Pega este código en tu Google Sheet en **Extensiones > Apps Script** y despliégalo como **Aplicación Web** (*Acceso: Cualquier persona*):

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Bloqueo ocupado por concurrencia: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error', message: 'Cuerpo de petición vacío'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    if (payload.action === 'PING') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success', message: 'Conexión exitosa con REGISTRO-M'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Ventas");
    if (!sheet) {
      sheet = ss.insertSheet("Ventas");
      sheet.appendRow([
        "ID de registro", "Fecha", "Hora", "Usuario", "Comercio",
        "Producto", "Unidades vendidas", "Precio unitario", "Valor total", "Método de pago"
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#000000").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    var lastRow = sheet.getLastRow();
    var existingIds = {};
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        var idVal = String(idValues[i][0]).trim();
        if (idVal) existingIds[idVal] = true;
      }
    }

    var rowsToInsert = [];
    var items = payload.items || [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var regId = String(it.registroId || (payload.visitaId + "-" + (j + 1))).trim();
      if (!existingIds[regId]) {
        rowsToInsert.push([
          regId, payload.fecha || '', payload.hora || '', payload.usuario || '', payload.comercio || '',
          it.producto || '', Number(it.unidades || 0), Number(it.precioUnitario || 0),
          Number(it.subtotal || 0), it.metodoPago || 'Efectivo'
        ]);
        existingIds[regId] = true;
      }
    }

    if (rowsToInsert.length > 0) {
      sheet.getRange(lastRow + 1, 1, rowsToInsert.length, 10).setValues(rowsToInsert);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success', visitaId: payload.visitaId, registrosInsertados: rowsToInsert.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

---

## 📦 Ejecución Directa

Abre el archivo `index.html` directamente en tu navegador preferido:
```bash
open index.html
```
O levanta un servidor HTTP local ligero:
```bash
python3 -m http.server 8080
# Abrir en navegador: http://localhost:8080
```
