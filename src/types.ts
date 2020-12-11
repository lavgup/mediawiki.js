export interface Config {
    server: string,
    path: string,
    botUsername?: string,
    botPassword?: string
}

export interface Payload {
    responseType: 'json' | 'text' | 'buffer' | undefined;
    [key: string]: any;
}

export interface ResObject {
    [key: string]: any;
}