export interface Config {
    server: string,
    path: string,
    botUsername?: string,
    botPassword?: string
}

export interface Payload {
    responseType: string;
    [key: string]: any;
}

export interface ResObject {
    [key: string]: any;
}