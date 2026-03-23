import { CookieOptions } from 'express'
import ms from 'ms'

if (!process.env.AUTH_ACCESS_TOKEN_SECRET) {
    throw new Error('AUTH_ACCESS_TOKEN_SECRET is not defined')
}

if (!process.env.AUTH_REFRESH_TOKEN_SECRET) {
    throw new Error('AUTH_REFRESH_TOKEN_SECRET is not defined')
}

export const { PORT = '3000' } = process.env
export const { DB_ADDRESS = 'mongodb://127.0.0.1:27017/weblarek' } = process.env

export const ACCESS_TOKEN = {
    secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
    expiry: process.env.AUTH_ACCESS_TOKEN_EXPIRY || '15m',
}

export const REFRESH_TOKEN = {
    secret: process.env.AUTH_REFRESH_TOKEN_SECRET,
    expiry: process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d',
    cookie: {
        name: 'refreshToken',
        options: {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: ms(process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d'),
            path: '/',
        } as CookieOptions,
    },
}

export const { ORIGIN_ALLOW = 'http://localhost:5173' } = process.env
