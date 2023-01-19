import { SlashCommandBuilder } from "discord.js";
import axios from "axios"

export default {
    data: new SlashCommandBuilder()
        .setName('unsubscribe-all')
        .setDescription('Unsubscribe from all notifications.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('Unsubscribe yourself from all of your notifications.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Unubscribe this channel from all of its notifications.')),
    async execute(interaction) {
        await interaction.reply(`TEST REPLY: user id is ${interaction.user.id}`)
    }
}
