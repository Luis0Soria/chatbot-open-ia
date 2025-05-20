require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

    if (body.object === 'page') {
        for (const entry of body.entry) {
            const event = entry.messaging[0];
            const senderId = event.sender.id;

            if (event.message && event.message.text) {
                const userMessage = event.message.text;
                console.log(`Mensaje recibido: ${userMessage}`);

                const aiResponse = await getOpenAIResponse(userMessage);
                await sendMessage(senderId, aiResponse);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
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

async function getOpenAIResponse(userMessage) {
    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
    };
    const data = {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }]
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