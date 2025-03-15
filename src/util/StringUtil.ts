export class StringUtil {

    public static formatYouTubeTime(time: string) {
        // Split the input string into parts using ":" as a delimiter
        const parts = time.split(":").map(Number);
        let hours = 0, minutes = 0, seconds = 0;

        if (parts.length === 3) {
            // Format: hours:minutes:seconds
            [hours, minutes, seconds] = parts;
        } else if (parts.length === 2) {
            // Format: minutes:seconds
            [minutes, seconds] = parts;
        } else if (parts.length === 1) {
            // Format: seconds only (edge case)
            [seconds] = parts;
        }

        // Format the output string
        const readableTime = [
            hours > 0 ? `${hours} hour${hours !== 1 ? "s" : ""}` : null,
            minutes > 0 ? `${minutes} minute${minutes !== 1 ? "s" : ""}` : null,
            `${seconds} second${seconds !== 1 ? "s" : ""}`
        ].filter(Boolean).join(", ");

        return readableTime;
    }

    public static formatSeconds(totalSeconds: number) {
        const hours = Math.floor(totalSeconds / 3600); // Calculate hours
        const minutes = Math.floor((totalSeconds % 3600) / 60); // Calculate remaining minutes
        const seconds = totalSeconds % 60; // Calculate remaining seconds

        // Format the output string
        const readableTime = [
            hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : null,
            minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : null,
            `${seconds} second${seconds !== 1 ? 's' : ''}`
        ].filter(Boolean).join(", ");

        return readableTime;
    }
}