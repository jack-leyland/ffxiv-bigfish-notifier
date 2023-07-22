import { SlashCommandBuilder } from "discord.js";
import axios from "axios"
import CONFIG from "../common/config.js";
import { logger } from "../common/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register this channel with FishEyes to start receiving notifcations!')
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        try {
            let res = await axios.post(`${CONFIG.ROOT_SUBSCRIPTION_ENDPOINT}/users`, 
            {
                id: interaction.channelId,
                strategy:"discord",
                isDiscordChannel: true
            })

            if (res.data.success) {
                await interaction.reply({content:`Channel successfully registered!`, ephemeral: true})
            } else {
                await interaction.reply({content:`This channel is already registered.`, ephemeral: true})
            }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 400) {
                    logger.warn("Bad register request.")
                } else if (err.response.status === 500) {
                    logger.error("Notifier Server Error")
                }
            } else {
                logger.error("Unexpected client error.")
                logger.error(err)
            }
            await interaction.reply({content:`An Error Occurred. Please try again later.`, ephemeral: true})
        }
    }
}