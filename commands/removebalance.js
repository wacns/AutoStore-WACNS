const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removebalance')
        .setDescription("Remove a user's balance (Admin Only)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Admin-only
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose balance will be reduced')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The currency type for balance reduction')
                .setRequired(true)
                .addChoices(
                    { name: 'Diamond Lock (DL)', value: 'dl' },
                    { name: 'World Lock (WL)', value: 'wl' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount to be removed')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const type = interaction.options.getString('type');
        let amount = interaction.options.getInteger('amount');

        if (amount < 1) {
            return interaction.reply({ content: '❌ Amount must be greater than 0.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let amountInWL = 0;

            if (type === 'dl') {
                amountInWL = amount * 100;
            } else if (type === 'wl') {
                amountInWL = amount;
            }

            let user = await User.findOne({ userId: targetUser.id });
            if (!user || user.balance === 0) {
                return interaction.editReply({ content: `❌ User <@${targetUser.id}> is not registered or has no balance to remove.` });
            }

            if (user.balance < amountInWL) {
                return interaction.editReply({ content: `❌ Insufficient balance for <@${targetUser.id}>. Current balance: ${Math.floor(user.balance/100)} ${process.env.EMOJI_DL || '💎'} ${user.balance%100} ${process.env.EMOJI_WL || '🔒'}` });
            }

            user.balance -= amountInWL;
            await user.save();

            let inputDisplay = '';
            if (type === 'dl') {
                inputDisplay = `💎 **Diamond Lock:** ${amount} ${process.env.EMOJI_DL || '💎'}`;
            } else if (type === 'wl') {
                inputDisplay = `${process.env.EMOJI_WL || '🔒'} **World Lock:** ${amount} ${process.env.EMOJI_WL || '🔒'}`;
            }

            const embed = new EmbedBuilder()
                .setTitle('💸 Balance Removed (ADMIN)')
                .setColor('#FF0000') // Red for removal
                .setDescription(`
👤 **Target:** ${targetUser}
${inputDisplay}
💰 **Removed:** ${Math.floor(amountInWL/100)} ${process.env.EMOJI_DL || '💎'} ${amountInWL%100} ${process.env.EMOJI_WL || '🔒'}
💳 **New Balance:** ${Math.floor(user.balance/100)} ${process.env.EMOJI_DL || '💎'} ${user.balance%100} ${process.env.EMOJI_WL || '🔒'}
                `)
                .setTimestamp()
                .setFooter({ text: `Removed by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed] });

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('💸 Balance Removed')
                    .setColor('#FF0000')
                    .setDescription(`An admin has removed balance from your account.\n\n${inputDisplay}\n💳 **New Balance:** ${Math.floor(user.balance/100)} ${process.env.EMOJI_DL || '💎'} ${user.balance%100} ${process.env.EMOJI_WL || '🔒'}`)
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