import { AudioController } from "../AudioController";
import { BaseEvent } from "./BaseEvent";

export class DisconnectEvent extends BaseEvent {
    public execute() {
        console.log('disconnecting 📴');
        let mutable: AudioController[] = [...this.client.voiceConnections.values()];
        mutable.forEach((controller) => {
            controller.voiceConnection?.destroy();
        });
    }
}