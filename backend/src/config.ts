import { CookieOptions } from 'express'
import ms from 'ms'

export const { PORT = '3000' } = process.env
export const { DB_ADDRESS = 'mongodb://127.0.0.1:27017/weblarek' } = process.env

export const ACCESS_TOKEN = {
    secret: process.env.AUTH_ACCESS_TOKEN_SECRET || 'secret-dev',
    expiry: process.env.AUTH_ACCESS_TOKEN_EXPIRY || '15m',
}

export const REFRESH_TOKEN = {
    secret: process.env.AUTH_REFRESH_TOKEN_SECRET || 'secret-dev',
    expiry: process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d',
    cookie: {
        name: 'refreshToken',
        options: {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: ms(process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d'),
            path: '/',
        } as CookieOptions,
    },
}

export const { ORIGIN_ALLOW = 'http://localhost:5173' } = process.env

export const IS_RATE_LIMITED = Boolean(process.env.RATE_LIMITED) || false
export const RATE_LIMIT_POINTS = Number(process.env.RATE_LIMIT_POINTS) || 3
export const RATE_LIMIT_DURATION = Number(process.env.RATE_LIMIT_DURATION) || 1
export const RATE_LIMIT_BLOCK = Number(process.env.RATE_LIMIT_BLOCK) || 30
