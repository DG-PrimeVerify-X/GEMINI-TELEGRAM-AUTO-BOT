require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('BOT_TOKEN is missing in .env file');
    process.exit(1);
}

const bot = new Telegraf(token);
const app = express();
const PORT = process.env.PORT || 3000;

// Express setup for web dashboard
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Telegram Bot & Dashboard is running successfully!');
});

// /start Command Handler
bot.start((ctx) => {
    ctx.reply('🚀 Welcome to the Official Bot!\nChoose an option below:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📊 1M Prediction Hub', callback_data: 'prediction_hub' }],
                [{ text: '📞 Contact Support', url: 'https://t.me/your_support_username' }]
            ]
        }
    });
});

// Auto Accept Join Requests & Auto DM Feature
bot.on('chat_join_request', async (ctx) => {
    try {
        // Channel join request ko approve karein
        await ctx.telegram.approveChatJoinRequest(ctx.chat.id, ctx.from.id);
        console.log(Join request accepted for user: ${ctx.from.id});

        // User ko personal chat me Auto DM bhejin
        await ctx.telegram.sendMessage(
            ctx.from.id, 
            🎉 Welcome! Thanks for joining our channel. Check out our services and predictions below.
        );
    } catch (error) {
        console.error('Error handling join request:', error);
    }
});

// Launch Bot
bot.launch().then(() => {
    console.log('Telegram Bot started successfully!');
});

// Start Express Server
app.listen(PORT, () => {
    console.log(Web dashboard running on port ${PORT});
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
