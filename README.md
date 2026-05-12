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

## Nota sobre multi-dispositivo

En esta versión, los datos se guardan en localStorage (por dispositivo).
Para sincronización multi-dispositivo, contacta para configurar Vercel KV.

## Tecnología

- React 18 + Vite
- Vercel Serverless Functions (proxy API Anthropic)
- localStorage para persistencia
