import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import rateLimit from 'express-rate-limit'
import { randomBytes, timingSafeEqual } from 'crypto'

import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import { DB_ADDRESS, ORIGIN_ALLOW } from './config'

const { PORT = 3000 } = process.env
const app = express()

// Учитываем прокси (nginx в docker-compose), чтобы rate-limit корректно
// обрабатывал `X-Forwarded-For` и не падал с ValidationError.
app.set('trust proxy', true)

app.use(cookieParser())

app.use(
    cors({
        origin: ORIGIN_ALLOW,
        credentials: true,
    })
)

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(
    urlencoded({
        extended: true,
        limit: '10kb',
    })
)

app.use(
    json({
        limit: '10kb',
    })
)

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: 'Слишком много запросов, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
})
app.use(limiter)

const safeMethods = ['GET', 'HEAD', 'OPTIONS']
const csrfCookieName = 'XSRF-TOKEN'

const createCsrfError = () => {
    const error = new Error('Invalid CSRF token') as Error & {
        code?: string
        statusCode?: number
    }
    error.code = 'EBADCSRFTOKEN'
    error.statusCode = 403
    return error
}

const generateCsrfToken = () => randomBytes(32).toString('hex')

const isCsrfTokenValid = (
    headerToken: string | undefined,
    cookieToken: string | undefined
) => {
    if (!headerToken || !cookieToken) {
        return false
    }

    const headerBuffer = Buffer.from(headerToken)
    const cookieBuffer = Buffer.from(cookieToken)
    const headerBytes = new Uint8Array(headerBuffer)
    const cookieBytes = new Uint8Array(cookieBuffer)

    if (headerBytes.length !== cookieBytes.length) {
        return false
    }

    return timingSafeEqual(headerBytes, cookieBytes)
}

app.get('/csrf-token', (_req, res) => {
    const csrfToken = generateCsrfToken()
    res.cookie('XSRF-TOKEN', csrfToken, {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    })
    res.json({ csrfToken })
})

// Совместимость с тестами/клиентом: отдаём тот же CSRF-токен под ожидаемым URL.
app.get('/auth/csrf-token', (_req, res) => {
    const csrfToken = generateCsrfToken()
    res.cookie('XSRF-TOKEN', csrfToken, {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    })
    res.json({ csrfToken })
})

app.use((req, _res, next) => {
    const excludedPaths = ['/csrf-token', '/auth/csrf-token']
    const isExcludedPath = excludedPaths.some(
        (excludedPath) =>
            req.path === excludedPath || req.path.startsWith(`${excludedPath}/`)
    )

    if (safeMethods.includes(req.method)) {
        return next()
    }

    if (isExcludedPath) {
        return next()
    }

    const headerToken =
        req.get('x-csrf-token') || req.get('csrf-token') || req.body?.csrf
    const cookieToken = req.cookies?.[csrfCookieName]

    if (!isCsrfTokenValid(headerToken, cookieToken)) {
        return next(createCsrfError())
    }

    return next()
})

app.use(routes)

app.use(errors())

app.use(errorHandler)

const startServer = () => {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
}

const connectDbWithRetry = async (retriesLeft = 30) => {
    try {
        await mongoose.connect(DB_ADDRESS)
        console.log('MongoDB connected')
    } catch (error) {
        console.error('MongoDB connection failed:', error)
        if (retriesLeft <= 0) {
            console.error('MongoDB connection retries exhausted')
            return
        }

        // Небольшая задержка даёт MongoDB подняться в docker-compose
        setTimeout(() => {
            connectDbWithRetry(retriesLeft - 1).catch(() => {})
        }, 1500)
    }
}

startServer()
connectDbWithRetry().catch(() => {})
