const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const Config = require('../models/Config');

// Emojis (Configurable)
const E = {
    reg: process.env.EMOJI_REGISTER || '👤',
    buy: process.env.EMOJI_BUY || '🛒',
    store: process.env.EMOJI_STORE || '🏪',
    success: process.env.EMOJI_SUCCESS || '✅',
    error: process.env.EMOJI_ERROR || '❌',
    load: process.env.EMOJI_LOADING || '⏳',
    pend: process.env.EMOJI_PENDING || '🕒', // For last update/pending 
    autoDeposit: process.env.EMOJI_DEPOSIT || '💎', // For auto deposit log
    dl: process.env.EMOJI_DL || '💎', 
    wl: process.env.EMOJI_WL || '🔒', 
    bal: process.env.EMOJI_BALANCE || '💰',
    leaderboardTitle: process.env.EMOJI_LEADERBOARD_TITLE || '🏆',
    medal1: process.env.EMOJI_MEDAL_1 || '🥇',
    medal2: process.env.EMOJI_MEDAL_2 || '🥈',
    medal3: process.env.EMOJI_MEDAL_3 || '🥉',
};

// -----------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Display Top Spender Leaderboard (Auto-Refresh)'),

    async execute(interaction) {
        const msg = await interaction.deferReply({ fetchReply: true });

        async function getLeaderboardContent() {
            try {
                // Sorting berdasarkan totalSpent (Belanja Terbanyak), bukan balance
                const users = await User.find({ totalSpent: { $gt: 0 } }).sort({ totalSpent: -1 }).limit(10);
                const currentTimestamp = Math.floor(Date.now() / 1000); 
                //
                let desc = `${E.pend} **Last Update:** <t:${currentTimestamp}:R>\n*(Auto refresh every 30 seconds)*\n\n__________________________\n\n**Top Spending Rankings**\n`;

                if (users.length === 0) {
                    desc += "*No spending data yet.*";
                } else {
                    users.forEach((u, index) => {
                        let medal = `${index + 1}.`;
                        if (index === 0) medal = E.medal1;
                        if (index === 1) medal = E.medal2; 
                        if (index === 2) medal = E.medal3;

                        // Format: 🥇 @User — X DL Y WL
                        const totalSpent = u.totalSpent || 0;
                        desc += `${medal} <@${u.userId}> — **${Math.floor(totalSpent / 100)} ${E.dl} ${totalSpent % 100} ${E.wl}**\n`;
                    });
                }

                const embed = new EmbedBuilder() //
                    .setTitle(`${E.leaderboardTitle} TOP SPENDER LEADERBOARD ${E.leaderboardTitle}`) 
                    .setColor('#FFD700') // Warna Gold
                    .setDescription(desc)
                    .setImage(process.env.BANNER_URL) //
                    .setFooter({ text: `Thank you for shopping!`, iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                return { embeds: [embed] };

            } catch (error) {
                console.error("LB Error:", error);
                return null;
            }
        }

        const initialContent = await getLeaderboardContent();
        if (initialContent) {
            await interaction.editReply(initialContent);
            
            await Config.findOneAndUpdate(
                { id: 'main_config' },
                { leaderboardChannelId: msg.channel.id, leaderboardMessageId: msg.id },
                { upsert: true }
            );
        }
    },
};