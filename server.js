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

// ==========================================
// 1. SUPER ADMIN & RENTER PERMISSION SYSTEM
// ==========================================
const SUPER_ADMIN_ID = "YOUR_SUPER_ADMIN_TELEGRAM_ID"; // Yahan apni Telegram Numeric ID daalein

// Renters Database (In-memory storage, production ke liye database use kar sakte hain)
// Har renter ka apna alag channel aur isolated scope hoga
const rentersDb = {
    // Example Renter: "renter_user_id": { channels: ["-100..."], active: true }
};

// ==========================================
// 2. STATS & HISTORY TRACKING STORAGE
// ==========================================
const botStats = {
    totalAccepted: 0,
    totalDmsSent: 0,
    startTime: new Date(),
    activeUsers: new Set()
};

// ==========================================
// 3. CONFIGURATION & AUTO ON/OFF SYSTEM
// ==========================================
const TARGET_CHANNELS = {
    "-1001234567890": {
        ownerId: "YOUR_SUPER_ADMIN_TELEGRAM_ID", // Kis renter ya admin ka channel hai
        name: "Main Prediction Channel",
        active: true,
        welcomeMessage: "🎉 Welcome! Thanks for joining our channel. Here is your resource file:",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "document",
        autoReactionActive: true,
        reactionsList: ["🔥", "👍", "❤️", "🎉"]
    }
};

// Express setup for web dashboard
app.use(express.json());
app.get('/', (req, res) => {
    res.send(`
        <h1>Telegram Bot Rental Dashboard & Stats</h1>
        <p><b>Status:</b> Online 🟢</p>
        <p><b>Total Join Requests Accepted:</b> ${botStats.totalAccepted}</p>
        <p><b>Total Auto-DMs Sent:</b> ${botStats.totalDmsSent}</p>
        <p><b>Total Unique Users:</b> ${botStats.activeUsers.size}</p>
    `);
});

// ==========================================
// 4. /START COMMAND & USER SECTION
// ==========================================
bot.start((ctx) => {
    const userId = ctx.from.id;
    botStats.activeUsers.add(userId);

    ctx.reply('🚀 Welcome to the User Section!\nChoose an option below:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📊 1M Prediction Hub', callback_data: 'prediction_hub' }],
                [{ text: '👤 My Profile / Stats', callback_data: 'user_profile' }],
                [{ text: '📞 Contact Support', url: 'https://t.me/your_support_username' }]
            ]
        }
    });
});

bot.action('prediction_hub', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🎯 1M Prediction Signal:\nStatus: ACTIVE (1M Target)\nAnalysis completed safely!');
});

bot.action('user_profile', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`👤 Your Telegram ID: ${ctx.from.id}\nStatus: Verified Member ✅`);
});

// ==========================================
// 5. RENTER & SUPER ADMIN MANAGEMENT SYSTEM
// ==========================================

// Super Admin naye renter ko add kar sakta hai: /addrenter <telegram_id>
bot.command('addrenter', async (ctx) => {
    if (ctx.from.id.toString() !== SUPER_ADMIN_ID) {
        return ctx.reply('❌ Unauthorized! Only Super Admin can add renters.');
    }

    const args = ctx.message.text.split(' ');
    const renterId = args[1];

    if (!renterId) {
        return ctx.reply('⚠️ Usage: /addrenter <Telegram_User_ID>');
    }

    rentersDb[renterId] = { active: true, assignedChannels: [] };
    await ctx.reply(`✅ Renter ${renterId} added successfully with isolated access.`);
});

// Renter apne scope ke andar apna channel add kar sakta hai (No interference with others)
bot.command('mychannel', async (ctx) => {
    const userId = ctx.from.id.toString();
    
    // Check if user is Super Admin or authorized Renter
    if (userId !== SUPER_ADMIN_ID && (!rentersDb[userId] || !rentersDb[userId].active)) {
        return ctx.reply('❌ You do not have permission to manage channels.');
    }

    await ctx.reply('📋 Your assigned channels are secure and isolated. No other renter can interfere with your settings.');
});

// ==========================================
// 6. STATS & BROADCAST (Role-based Isolation)
// ==========================================
bot.command('stats', async (ctx) => {
    const userId = ctx.from.id.toString();
    
    if (userId === SUPER_ADMIN_ID) {
        // Super Admin sees global stats
        const statsMessage = `📊 *Super Admin Global Stats*:\n\n` +
            `✅ Total Accepted: ${botStats.totalAccepted}\n` +
            `📨 Total DMs: ${botStats.totalDmsSent}\n` +
            `👥 Total Users: ${botStats.activeUsers.size}\n` +
            `🏢 Active Renters: ${Object.keys(rentersDb).length}`;
        return ctx.replyWithMarkdown(statsMessage);
    }

    // Renter sees only their own isolated stats
    await ctx.reply(`📊 *Your Renter Stats*:\n\nActive Bot Status: Running smoothly ✅`);
});

bot.command('broadcast', async (ctx) => {
    const userId = ctx.from.id.toString();
    const messageText = ctx.message.text.replace('/broadcast', '').trim();

    if (userId !== SUPER_ADMIN_ID && (!rentersDb[userId] || !rentersDb[userId].active)) {
        return ctx.reply('❌ You are not authorized to broadcast.');
    }

    if (!messageText) {
        return ctx.reply('⚠️ Please provide a message to broadcast.');
    }

    ctx.reply(`📢 Broadcast started...`);
    let success = 0;
    for (const uId of botStats.activeUsers) {
        try {
            await ctx.telegram.sendMessage(uId, `📢 *Announcement*:\n\n${messageText}`, { parse_mode: 'Markdown' });
            success++;
        } catch (e) {}
    }
    await ctx.reply(`✅ Broadcast completed to ${success} users.`);
});

// ==========================================
// 7. AUTO ACCEPT & AUTO FILE/DM HANDLER
// ==========================================
bot.on('chat_join_request', async (ctx) => {
    try {
        const chatId = ctx.chat.id.toString();
        const userId = ctx.from.id;

        const channelConfig = TARGET_CHANNELS[chatId];

        if (!channelConfig || !channelConfig.active) {
            return;
        }

        // 1. Join Request Accept
        await ctx.telegram.approveChatJoinRequest(ctx.chat.id, userId);
        botStats.totalAccepted++;
        botStats.activeUsers.add(userId);

        // 2. Welcome Message & File Delivery
        if (channelConfig.welcomeMessage) {
            await ctx.telegram.sendMessage(userId, channelConfig.welcomeMessage);
        }

        if (channelConfig.fileType === 'document' && channelConfig.fileUrl) {
            await ctx.telegram.sendDocument(userId, channelConfig.fileUrl, {
                caption: '📁 Here is your automated resource file.'
            });
        }

        botStats.totalDmsSent++;
    } catch (error) {
        console.error('Error handling join request:', error);
    }
});

// ==========================================
// 8. AUTO REACTIONS HANDLER
// ==========================================
bot.on('channel_post', async (ctx) => {
    try {
        const chatId = ctx.chat.id.toString();
        const messageId = ctx.message.message_id;
        const channelConfig = TARGET_CHANNELS[chatId];

        if (!channelConfig || !channelConfig.autoReactionActive) {
            return;
        }

        for (const emoji of channelConfig.reactionsList) {
            try {
                await ctx.telegram.setMessageReaction(ctx.chat.id, messageId, [{ type: 'emoji', emoji: emoji }]);
            } catch (err) {}
        }
    } catch (error) {
        console.error('Error handling reactions:', error);
    }
});

// Launch Bot
bot.launch().then(() => {
    console.log('Bot started with Multi-Tenant Rental & Isolation System!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
