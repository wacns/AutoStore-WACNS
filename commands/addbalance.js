const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbalance')
        .setDescription('Admin: Tambah saldo user')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(o => o.setName('user').setDescription('Target User').setRequired(true))
        .addIntegerOption(o => o.setName('jumlah').setDescription('Nominal').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('jumlah');

        let user = await User.findOne({ userId: target.id });
        if (!user) user = new User({ userId: target.id });

        user.balance += amount;
        await user.save();

        interaction.reply(`✅ Berhasil menambah **Rp${amount.toLocaleString()}** ke ${target.username}.\nSaldo sekarang: Rp${user.balance.toLocaleString()}`);
    }
};