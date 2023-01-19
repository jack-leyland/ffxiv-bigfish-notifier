import { SlashCommandBuilder } from "discord.js";
import axios from "axios"

export default {
    data: new SlashCommandBuilder()
        .setName('subscribe')
        .setDescription('Subscribe to fish notifications! Must be registered first.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('Subscribe yourself to notifications for a fish.')
                .addStringOption(option =>
                    option.setName('fish')
                        .setDescription('The name of the fish you want to subscribe to.')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('minutes')
                        .setDescription('How many minutes before the window opens would you like to be notified?')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option.setName('intuition')
                        .setDescription(`Would like to be automatically subscribed to the fish's intuition requirements?`)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Subscribe this channel to notifications for a fish.')
                .addStringOption(option =>
                    option.setName('fish')
                        .setDescription('The name of the fish you want to subscribe to.')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('minutes')
                        .setDescription('How many minutes before the window opens would you like to be notified?')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option.setName('intuition')
                        .setDescription(`Would like to be automatically subscribed to the fish's intuition requirements?`)
                )),
    async execute(interaction) {
        await interaction.reply(`TEST REPLY: user id is ${interaction.user.id}`)
    }
}
