const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Config = require('../models/Config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setworld')
        .setDescription('Admin: Atur info world deposit')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName('world').setDescription('Nama World').setRequired(true))
        .addStringOption(o => o.setName('owner').setDescription('Nama Owner').setRequired(true))
        .addStringOption(o => o.setName('bot').setDescription('Nama Bot yang stay').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const world = interaction.options.getString('world');
        const owner = interaction.options.getString('owner');
        const botName = interaction.options.getString('bot');

        try {
            // Update atau Buat baru jika belum ada (upsert: true)
            await Config.findOneAndUpdate(
                { id: 'main_config' },
                { world, owner, botName },
                { upsert: true, new: true }
            );

            interaction.editReply(`✅ **Info Deposit Diupdate!**\n🌍 World: ${world}\n👑 Owner: ${owner}\n🤖 Bot: ${botName}`);
        } catch (err) {
            console.error(err);
            interaction.editReply('❌ Gagal update database.');
        }
    }
};