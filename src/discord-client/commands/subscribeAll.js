import { SlashCommandBuilder } from "discord.js";
import axios from "axios"

export default {
    data: new SlashCommandBuilder()
        .setName('subscribe-all')
        .setDescription('Subscribe to notifications for every timed fish in the game! (There are a lot!)')
        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('How many minutes before the windows opens would you like to be notified?')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        await interaction.reply(`TEST REPLY: user id is ${interaction.user.id}`)
    }
}