import { SlashCommandBuilder } from "discord.js";
import axios from "axios"
import CONFIG from "../common/config.js";
import { logger } from "../common/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName('forget')
        .setDescription('Delete your account and all subscriptions from FishEyes. This is irreversable!')
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        try {
            let res = await axios.delete(`${CONFIG.ROOT_SUBSCRIPTION_ENDPOINT}/users`,
                {
                    params: {
                        id: interaction.channelId,
                        strategy: "discord",
                    }
                })

            if (res.data.success) {
                await interaction.reply({ content: `Channel successfully deleted!`, ephemeral: true })
            } 
        } catch (err) {
            if (err.response) {
                if (err.response.status === 400) {
                    logger.warn("Bad Forget Request.")
                } else if (err.response.status === 500) {
                    logger.error("Notifier Server Error")
                }
            } else {
                logger.error("Unexpected client error.")
                logger.error(err)
            }
            await interaction.reply({ content: `An Error Occurred. Please try again later.`, ephemeral: true })
        }
    }
}