# Chatbot para Meta (Facebook/Instagram)

Este es un chatbot básico para Meta que puede ser desplegado en Railway y conectado a Facebook/Instagram.

## Configuración

1. Clona este repositorio
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` con las siguientes variables:
   ```
   PAGE_ACCESS_TOKEN=tu_token_de_pagina_de_meta
   VERIFY_TOKEN=token_de_verificación_para_webhook
   ```

## Configuración en Meta Developers

1. Crea una aplicación en [Meta Developers](https://developers.facebook.com)
2. Configura el webhook con la URL de tu aplicación
3. Obtén el token de acceso de la página
4. Configura el token de verificación

## Despliegue en Railway

1. Crea una cuenta en [Railway](https://railway.app)
2. Conecta tu repositorio
3. Agrega las variables de entorno en Railway
4. ¡Listo! Tu chatbot estará funcionando

## Funcionalidades

- ✅ Recibe mensajes de Facebook e Instagram
- ✅ Verifica el webhook de Meta
- ✅ Responde automáticamente
- 🔄 Listo para conectar con OpenAI 