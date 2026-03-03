const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Admin: Show all available slash commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const commandsPath = path.join(__dirname); // Gets the current directory './commands'
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            let description = 'Here is a list of all available commands:\n\n';

            for (const file of commandFiles) {
                const command = require(`./${file}`);
                if (command.data) {
                    description += `**/${command.data.name}**\n`;
                    description += `*${command.data.description}*\n\n`;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🤖 Command List')
                .setColor('#0099FF')
                .setDescription(description)
                .setFooter({ text: 'All commands are for Admins only.' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Help command error:", error);
            await interaction.editReply('❌ An error occurred while fetching the command list.');
        }
    },
};