export default {
    data: new SlashCommandBuilder()
        .setName('forget')
        .setDescription('Delete your account and all subscriptions from FishEyes. This is irreversable!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('Delete your account and all subscriptions from FishEyes. This is irreversable!'))
        .addSubcommand(subcommand =>
                    subcommand
                        .setName('channel')
                        .setDescription(`Delete this channel's account and all subscriptions from FishEyes. This is irreversable!`)),
    async execute(interaction) {
        await interaction.reply(`TEST REPLY: user id is ${interaction.user.id}`)
    }
}