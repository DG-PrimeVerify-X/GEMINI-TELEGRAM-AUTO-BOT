const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_USER_ID);

if (!BOT_TOKEN) {
    console.error('Error: BOT_TOKEN is missing in .env file.');
    process.exit(1);
}

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const bot = new Telegraf(BOT_TOKEN);

// --- MODULAR SYSTEM STATE & AUTOMATIONS ---
let systemState = {
    autoAccept: true,
    autoDm: true,
    autoDmText: "Welcome! Thanks for joining our network. Check out our services.",
    autoReaction: true,
    predictionStatus: "ACTIVE (1M Target)",
    contactUsername: "@YourAdminUsername",
    subAdmins: []
};

let botStats = {
    totalUsers: 1,
    activeChannels: 1,
    predictionsRun: 1250,
    systemHealth: 'Online 🟢'
};

let logs = [
    { time: new Date().toLocaleTimeString(), message: 'Modular core initialized successfully.' }
];

// --- TELEGRAM BOT LOGIC ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    botStats.totalUsers += 1;
    logs.unshift({ time: new Date().toLocaleTimeString(), message: `New user started bot: ${userId}` });
    
    // Welcome message with Interactive Buttons
    await ctx.reply("🚀 Welcome to the Official Bot!\nChoose an option below:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📊 1M Prediction Hub', callback_data: 'get_prediction' }],
                [{ text: '📞 Contact Support', url: `https://t.me/${systemState.contactUsername.replace('@', '')}` }]
            ]
        }
    });

    // Auto-DM Feature
    if (systemState.autoDm) {
        try {
            await ctx.telegram.sendMessage(userId, `📬 *Auto-DM Notice:* ${systemState.autoDmText}`, { parse_mode: 'Markdown' });
        } catch (e) {
            console.log('Could not send Auto-DM (privacy settings).');
        }
    }
});

// Auto-Accept Join Requests Feature
bot.on('chat_join_request', async (ctx) => {
    if (systemState.autoAccept) {
        try {
            await ctx.approveChatJoinRequest();
            logs.unshift({ time: new Date().toLocaleTimeString(), message: `Auto-accepted join request for chat ID: ${ctx.chat.id}` });
        } catch (e) {
            console.log('Failed to auto-accept:', e);
        }
    }
});

// Inline Callbacks (1M Prediction System)
bot.on('callback_query', async (ctx) => {
    if (ctx.callbackQuery.data === 'get_prediction') {
        await ctx.answerCbQuery();
        botStats.predictionsRun += 1;
        await ctx.reply(`🎯 *1M Prediction Signal:* \nStatus: ${systemState.predictionStatus}\nAnalysis completed safely!`, { parse_mode: 'Markdown' });
    }
});

bot.launch().then(() => {
    console.log('Telegram Bot started successfully!');
});

// --- DASHBOARD API ROUTES ---
app.get('/api/state', (req, res) => {
    res.json({ systemState, botStats, ADMIN_ID });
});

app.get('/api/logs', (req, res) => {
    res.json(logs);
});

app.post('/api/settings', (req, res) => {
    const { autoAccept, autoDm, autoDmText, autoReaction, predictionStatus, contactUsername, subAdmins } = req.body;
    
    if (typeof autoAccept === 'boolean') systemState.autoAccept = autoAccept;
    if (typeof autoDm === 'boolean') systemState.autoDm = autoDm;
    if (typeof autoDmText === 'string') systemState.autoDmText = autoDmText;
    if (typeof autoReaction === 'boolean') systemState.autoReaction = autoReaction;
    if (typeof predictionStatus === 'string') systemState.predictionStatus = predictionStatus;
    if (typeof contactUsername === 'string') systemState.contactUsername = contactUsername;
    if (Array.isArray(subAdmins)) systemState.subAdmins = subAdmins.map(id => Number(id));

    logs.unshift({ time: new Date().toLocaleTimeString(), message: 'Configurations updated via Web Dashboard.' });
    res.json({ success: true, systemState });
});

app.post('/api/broadcast', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    logs.unshift({ time: new Date().toLocaleTimeString(), message: `Broadcast sent: "${message.substring(0, 25)}..."` });
    res.json({ success: true, message: 'Broadcast initiated successfully!' });
});

app.listen(PORT, () => {
    console.log(`Server & Dashboard running at http://localhost:${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
