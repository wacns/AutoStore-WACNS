const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekbalance')
        .setDescription('Melihat saldo Anda atau user lain.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang ingin dilihat saldonya (kosongkan untuk diri sendiri)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply({ ephemeral: true });

        try {
            let user = await User.findOne({ userId: targetUser.id });

            let balanceDL = 0;
            let balanceWL = 0;

            if (user && user.balance > 0) {
                balanceDL = Math.floor(user.balance / 100);
                balanceWL = user.balance % 100;
            }

            const embed = new EmbedBuilder()
                .setTitle(' Saldo Anda')
                .setColor('Green')
                .setDescription(`
Saldo <@${targetUser.id}> saat ini:
**${balanceDL} ${process.env.EMOJI_DL || '💎'} ${balanceWL} ${process.env.EMOJI_WL || '🔒'}**
                `)
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat mengakses database.' });
        }
    },
};