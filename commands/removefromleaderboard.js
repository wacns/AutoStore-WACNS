const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removefromleaderboard')
        .setDescription("Admin: Remove a user from the leaderboard (sets totalSpent to 0)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to remove from the leaderboard')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Cari user di database
            const user = await User.findOne({ userId: targetUser.id });

            if (!user) {
                return interaction.editReply(`❌ User **${targetUser.username}** not found in the database.`);
            }

            // Simpan nilai totalSpent lama untuk log
            const oldTotalSpent = user.totalSpent || 0;

            if (oldTotalSpent === 0) {
                return interaction.editReply(`ℹ️ User **${targetUser.username}** is already not on the leaderboard (totalSpent = 0).`);
            }

            // Set totalSpent menjadi 0 (otomatis hilang dari leaderboard)
            await User.updateOne(
                { userId: targetUser.id },
                { $set: { totalSpent: 0 } }
            );

            // Embed konfirmasi
            const embed = new EmbedBuilder()
                .setTitle('✅ User Removed from Leaderboard')
                .setColor('#FFA500')
                .setDescription(`
👤 **User:** ${targetUser} (${targetUser.username})
📉 **Previous Total Spent:** ${Math.floor(oldTotalSpent/100)} ${process.env.EMOJI_DL || '💎'} ${oldTotalSpent%100} ${process.env.EMOJI_WL || '🔒'}
✅ **Status:** Successfully removed from the leaderboard
                `)
                .setFooter({ 
                    text: `Removed by ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();

            // Kirim log ke channel khusus jika ada
            const logChannelId = process.env.CHANNEL_TOPUP_ID || process.env.CHANNEL_BUY_ID;
            if (logChannelId) {
                try {
                    const logChannel = await interaction.client.channels.fetch(logChannelId);
                    if (logChannel) {
                        await logChannel.send({ 
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('🗑️ LEADERBOARD UPDATE')
                                    .setColor('#FF0000')
                                    .setDescription(`**User removed from leaderboard**\n👤 <@${targetUser.id}>\n👮‍♂️ By: <@${interaction.user.id}>\n📉 Previous Total Spent: ${Math.floor(oldTotalSpent/100)} ${process.env.EMOJI_DL || '💎'} ${oldTotalSpent%100} ${process.env.EMOJI_WL || '🔒'}`)
                                    .setTimestamp()
                            ] 
                        });
                    }
                } catch (err) {
                    console.error('Failed to send log:', err);
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ An error occurred while processing the request.');
        }
    },
};