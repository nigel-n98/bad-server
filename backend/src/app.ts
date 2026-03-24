import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import rateLimit from 'express-rate-limit'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import { DB_ADDRESS, ORIGIN_ALLOW, PORT } from './config'

const app = express()

app.use(cookieParser())
app.use(cors({ origin: ORIGIN_ALLOW, credentials: true }))
app.use(serveStatic(path.join(__dirname, 'public')))
app.use(urlencoded({ extended: true, limit: '10kb' }))
app.use(json({ limit: '10kb' }))

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
})

app.use((req, res, next) => {
    if (req.path === '/auth/csrf-token') {
        return next()
    }
    return limiter(req, res, next)
})

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)

        app.use(routes)
        app.use(errors())
        app.use(errorHandler)

        app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
