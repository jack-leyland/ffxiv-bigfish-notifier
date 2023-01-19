/**
 * Running this in a prod environment will push command info to all 
 * server. We don't want to do that very often so be careful.
 */

import * as dotenv from 'dotenv'
import path from "path"
const __dirname = path.resolve();
dotenv.config({ path: path.resolve(__dirname, "./src/discord-client/.env") })
import { REST, Routes } from 'discord.js';
import fs from 'fs';

const isProd = process.env.NODE_ENV === "production"
const TOKEN = isProd ? process.env.BOT_TOKEN : process.env.DEV_BOT_TOKEN
const CLIENT_ID = isProd ? process.env.CLIENT_ID : process.env.DEV_CLIENT_ID

const commands = [];
const commandsPath = path.resolve(__dirname, './src/discord-client/commands');
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));


// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
    const filePath = path.resolve(commandsPath, file);
    const { default: command } = await import(filePath);
	commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

        if (isProd) {
            const data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } else {
            const data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, process.env.TESTING_SERVER_ID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        }


		
	} catch (error) {
		console.error(error);
	}
})();