# ORC Race Tracker

Aplicación de clasificación ORC en tiempo real para regatas de vela.

## Despliegue en Vercel (5 minutos)

### Opción A: Sin código (más fácil)

1. Ve a [vercel.com](https://vercel.com) → crea cuenta gratis
2. Pulsa "Add New Project" → "Upload"
3. Sube la carpeta `orc-race-tracker` completa
4. En "Environment Variables" añade:
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: tu clave de [console.anthropic.com](https://console.anthropic.com)
5. Pulsa "Deploy" → obtienes tu URL (ej: `orc-tracker.vercel.app`)

### Opción B: Con GitHub

1. Sube la carpeta a un repositorio GitHub
2. Importa en Vercel desde GitHub
3. Añade la variable de entorno `ANTHROPIC_API_KEY`
4. Deploy automático en cada push

## Características

- Clasificación ORC en tiempo real (ToD)
- Múltiples campeonatos
- Carga automática de flota desde web del evento (requiere clave API)
- Diagrama del recorrido W/L con offset
- Cuenta atrás configurable
- Posicionamiento de barcos durante la ceñida/popa

## Toma de tiempos por boya (nuevo flujo)

Pestaña **🎯 Boyas** dentro de *En Vivo*. Es ahora la vista por defecto en regata.

1. Eliges arriba la boya en la que estás (Ceñida 1, Offset 1, Popa 1, Ceñida 2, Llegada…).
2. Aparece la flota completa en rejilla, cada barco con su **foto de fondo** y el
   **número de vela completo** encima. Cabe en pantalla sin scroll.
   En boyas de ceñida/offset se usa la foto de ceñida y en popa/llegada la de spi.
   Si un barco no tiene foto, la baldosa usa su color. Las fotos se cargan en
   Config → Fotos de la flota.
3. Tocas el barco que pasa → el tiempo se guarda en el acto, en esa boya.
   El barco desaparece de la rejilla y baja a la tira de "tomados", ordenada por
   paso, con el gap al primero y el gap a nuestro barco.
4. Si un barco se te escapa, no pasa nada: lo tomas en la boya siguiente. Los
   tiempos se guardan con su boya explícita, así que saltarse boyas no descuadra
   la clasificación ORC.

Para corregir, toca el nombre en la tira de tomados: ±1 s o borrar.
El flujo antiguo (⏱ Crono → 📝 Tiempos) sigue disponible.

## Nota sobre multi-dispositivo

En esta versión, los datos se guardan en localStorage (por dispositivo).
Para sincronización multi-dispositivo, contacta para configurar Vercel KV.

## Tecnología

- React 18 + Vite
- Vercel Serverless Functions (proxy API Anthropic)
- localStorage para persistencia
