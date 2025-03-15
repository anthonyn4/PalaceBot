import { Interaction } from "discord.js";
import { BaseEvent } from "./BaseEvent";
import { CommandExecutor } from "../commands";
import { DiscordClient } from "../DiscordClient";

export class InteractionCreateEvent extends BaseEvent {

    constructor(client: DiscordClient, ix: Interaction) {
        super(client);
        this.ix = ix;
    }

    public execute(): void {
        if (!this.ix.isChatInputCommand()) return;
        const command = CommandExecutor.getCommand(this.client, this.ix.commandName);
        if (!command) return;

        command.interact(this.ix);
    }

    private ix: Interaction;
}