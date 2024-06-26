import axios, { AxiosInstance, AxiosProxyConfig } from "axios";
import { Logger } from "pino";

import * as fs from "fs/promises";

import { IFavouriteResponse, IFavouriteVideo } from "./interfaces/favourite.model.interface";

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36";

function client(proxyList?: string[]): AxiosInstance {
    let randomProxy;
    if (proxyList && proxyList.length > 0) {
        randomProxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    }

    return axios.create({
        baseURL: "https://www.tikwm.com/api/",
        headers: {
            "User-Agent": userAgent
        },
        timeout: 20000,
        proxy: randomProxy ? {
            host: randomProxy.split(":")[0],
            port: randomProxy.split(":")[1]
        } as unknown as AxiosProxyConfig : false
    })
}

export async function getLikedVideos(logger: Logger, username: string, count: number, proxyList?: string[]): Promise<IFavouriteVideo[] | null> {
    logger.info({
        from: 'getLikedVideos',
        event: 'newTask',
    });

    const response = await client(proxyList).get(`user/favorite?unique_id=${ username }&count=${ count }`);
    const { data } = response.data as IFavouriteResponse;

    if (!data) {
        logger.error({
            from: 'getLikedVideos',
            event: 'noDataErr',
            message: 'Could not get data from API'
        });
        return null;
    }

    if (!data.videos || data.videos.length === 0) {
        logger.error({
            from: 'getLikedVideos',
            event: 'noDataErr',
            message: 'No videos'
        });
        return null;
    }

    const videos: IFavouriteVideo[] = [];

    data.videos.map((video) => {
        videos.push({
            id: video.video_id,
            region: video.region,
            title: video.title,
            play: video.play,
            music: video.music,
            views: video.play_count,
            likes: video.digg_count,
            images: video.images,
            author: video.author
        })
    });

    logger.info({
        from: 'getLikedVideos',
        event: 'completed',
        entities: videos.length
    });

    return videos;
}

export async function downloadVideo(logger: Logger, link: string, path: string): Promise<void> {
    logger.info({
        from: 'downloadVideo',
        event: 'newTask',
    });

    const response = await client().get(link, { baseURL: '', responseType: 'arraybuffer' });

    if (!response.data || response.data.length === 0) {
        logger.error({
            from: 'downloadVideo',
            event: 'noDataErr',
            message: 'Could not get data from API'
        });
        return;
    }

    logger.info({
        from: 'downloadVideo',
        event: 'completed',
        size: response.data.length,
        path
    });

    await fs.writeFile(path, response.data);

    logger.info({
        from: 'downloadVideo',
        event: 'saved'
    });
}