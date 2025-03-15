import play from 'play-dl';

export class Auth {
    public static async refresh(ytCookie: string) {
        const soundcloudId = await play.getFreeClientID();

        play.setToken({
            soundcloud: {
                client_id: soundcloudId
            }
        });

        play.setToken({
            youtube: {
                cookie: ytCookie
            }
        })

        // await play.setToken({
        //     spotify: {
        //         client_id: "",
        //         client_secret: "",
        //         refresh_token: "",
        //         market: "US"
        //     }
        // });

        play.setToken({
            useragent: ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0"],
        })
    }
}