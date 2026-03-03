const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Config = require('../models/Config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ratedl')
        .setDescription('Admin: Set DL Rate (Price of 1 DL in Rupiah)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Price of 1 DL in Rupiah (Example: 15000)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const newRate = interaction.options.getInteger('amount');

        try {
            // 1. Update Database agar permanen (tersimpan meski bot restart)
            await Config.findOneAndUpdate(
                { id: 'main_config' },
                { rateDL: newRate },
                { upsert: true, new: true }
            );
            
            // 2. Update Runtime Variable agar langsung berubah saat ini juga
            process.env.RATE_DL = newRate;

            await interaction.editReply(`✅ **DL Rate Updated Successfully!**\n💎 1 ${process.env.EMOJI_DL || '💎'} = **Rp${newRate.toLocaleString()}**\n*(This rate will apply to Deposits & the Store display)*`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Failed to update the rate in the database.');
        }
    }
};
