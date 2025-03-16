import { BaseEvent } from "./BaseEvent";

export class ShutDownEvent extends BaseEvent {
    public execute() {
        console.log('disconnecting 📴');
    }
}