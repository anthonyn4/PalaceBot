import { BaseEvent } from "./BaseEvent";

export class ReadyEvent extends BaseEvent {

    public execute() {
        console.log("we up 🤙")
    }
}