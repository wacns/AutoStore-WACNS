﻿﻿﻿const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givebalance')
        .setDescription('Add balance to a user (Admin Only)')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to send balance to')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('type')
                .setDescription('Balance input type')
                .setRequired(true)
                .addChoices(
                    { name: 'Diamond Lock (DL)', value: 'dl' },
                    { name: 'World Lock (WL)', value: 'wl' }
                ))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Amount (in selected currency)')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const type = interaction.options.getString('type');
        let amount = interaction.options.getInteger('amount');

        if (amount < 1) {
            return interaction.reply({ content: '❌ Amount must be greater than 0.', ephemeral: true });
        }

        // 🔥 UPDATE: Set ephemeral: true agar hanya admin yang lihat
        await interaction.deferReply({ ephemeral: true });

        try {
            // Konversi ke WL (Satuan Utama)
            let amountInWL = 0;
            if (type === 'wl') amountInWL = amount;
            else if (type === 'dl') {
                amountInWL = amount * 100; // DL -> WL
            }

            let user = await User.findOne({ userId: targetUser.id });
            if (!user) {
                user = new User({ userId: targetUser.id, balance: 0, totalSpent: 0 });
            }

            user.balance += amountInWL;
            await user.save();

            // Tentukan tampilan input
            let inputDisplay = '';
            if (type === 'dl') {
                inputDisplay = `💎 **Diamond Lock:** ${amount} ${process.env.EMOJI_DL || '💎'}`;
            } else if (type === 'wl') {
                inputDisplay = `${process.env.EMOJI_WL || '🔒'} **World Lock:** ${amount} ${process.env.EMOJI_WL || '🔒'}`;
            }

            // Embed Sukses (Hanya Admin yang lihat)
            const embed = new EmbedBuilder()
                .setTitle('✅ Add Balance Successful') //
                .setColor('#00FF00')
                .setDescription(`
👤 **Target:** ${targetUser}
${inputDisplay}
💰 **Added:** ${Math.floor(amountInWL/100)} ${process.env.EMOJI_DL || '💎'} ${amountInWL%100} ${process.env.EMOJI_WL || '🔒'}
💳 **Total Balance:** ${Math.floor(user.balance/100)} ${process.env.EMOJI_DL || '💎'} ${user.balance%100} ${process.env.EMOJI_WL || '🔒'}
                `)
                .setTimestamp()
                .setFooter({ text: `Added by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed] });

            // Kirim DM ke Target User (User tetap dapat notif di DM)
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('💰 Balance Received')
                    .setColor('#00FF00')
                    .setDescription(`An admin has added balance to your account.\n\n${inputDisplay}\n💳 **Current Balance:** ${Math.floor(user.balance/100)} ${process.env.EMOJI_DL || '💎'} ${user.balance%100} ${process.env.EMOJI_WL || '🔒'}`)
                    .setTimestamp();
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (err) {
                // Ignore jika DM user tertutup
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ An error occurred while processing the data.' });
        }
    },
};