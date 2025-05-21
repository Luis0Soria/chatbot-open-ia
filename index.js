require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();

app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PAGE_ID = "61571437712685";

// Webhook GET (verificación desde Meta)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado con éxito');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Webhook POST (cuando llega un mensaje)
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page' || body.object === 'instagram') {
        for (const entry of body.entry) {
            const event = entry.messaging[0];
            const senderId = event.sender.id;

            if (event.message && event.message.text) {
                const userMessage = event.message.text;
                console.log(`Mensaje recibido: ${userMessage}`);

                // Personalizar el prompt según el canal
                let canal = body.object;
                let promptExtra = '';
                if (canal === 'instagram') {
                    promptExtra = 'Responde de manera breve, visual y amigable, usando emojis si es posible. No escribas más de 1900 caracteres. Si la respuesta es muy larga, resume o divide en partes.';
                } else if (canal === 'page') {
                    promptExtra = 'Responde de manera detallada y profesional, puedes extenderte en la explicación.';
                }

                const aiResponse = await getOpenAIResponse(userMessage, promptExtra, canal);
                // Si es Instagram, recorta la respuesta a 1900 caracteres
                let finalResponse = aiResponse;
                if (canal === 'instagram' && aiResponse.length > 1900) {
                    finalResponse = aiResponse.slice(0, 1900);
                }
                await sendMessage(senderId, finalResponse);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.get('/prueba', (req, res) => {
    res.send('¡Funciona!');
});

app.post('/openai', async (req, res) => {
    console.log("¡Petición recibida en /openai!", req.body);
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Falta el campo 'message' en el body." });
    }
    const aiResponse = await getOpenAIResponse(message);
    res.json({ reply: aiResponse });
});

// Enviar mensaje por la API de Meta
async function sendMessage(recipientId, text) {
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    const messageData = {
        recipient: { id: recipientId },
        message: { text }
    };

    try {
        await axios.post(url, messageData);
    } catch (err) {
        console.error("Error al enviar mensaje: ", err.response?.data || err.message);
    }
}

async function getRecentPosts() {
    const url = `https://graph.facebook.com/v18.0/${PAGE_ID}/posts?access_token=${PAGE_ACCESS_TOKEN}&limit=10`;
    try {
        const response = await axios.get(url);
        // Extrae solo el mensaje de cada post (si existe)
        const posts = response.data.data
            .map(post => post.message)
            .filter(Boolean);
        return posts;
    } catch (err) {
        console.error("Error al obtener posteos de Facebook:", err.response?.data || err.message);
        return [];
    }
}

async function getOpenAIResponse(userMessage, promptExtra = '', canal = 'page') {
    // Lee información fija desde el archivo conocimientos.txt
    let infoFija = '';
    try {
        infoFija = fs.readFileSync('conocimientos.txt', 'utf8') + '\n';
    } catch (err) {
        console.error('No se pudo leer conocimientos.txt:', err.message);
    }
    // Obtiene los 10 posteos más recientes
    const posts = await getRecentPosts();
    let context = "";
    if (posts.length > 0) {
        context = `Estos son los 10 posteos más recientes de la página de Facebook:\n${posts.map((p, i) => `${i+1}. ${p}`).join("\n")}\n\n`;
    }
    // Personalizar el contexto según el canal
    let prompt = infoFija + context + promptExtra + "\nUsuario: " + userMessage;

    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
    };
    const data = {
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: "Eres un asistente que responde usando la información de los posteos recientes de la página de Facebook cuando sea relevante." },
            { role: "user", content: prompt }
        ]
    };

    try {
        const response = await axios.post(url, data, { headers });
        return response.data.choices[0].message.content.trim();
    } catch (err) {
        console.error("Error con OpenAI:", err.response?.data || err.message);
        return "Lo siento, hubo un error al procesar tu mensaje.";
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 