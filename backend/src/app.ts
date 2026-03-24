// import { errors } from 'celebrate'
// import cookieParser from 'cookie-parser'
// import cors from 'cors'
// import 'dotenv/config'
// import express, { json, urlencoded } from 'express'
// import mongoose from 'mongoose'
// import path from 'path'
// import rateLimit from 'express-rate-limit'

// import errorHandler from './middlewares/error-handler'
// import serveStatic from './middlewares/serverStatic'
// import routes from './routes'
// import { DB_ADDRESS, ORIGIN_ALLOW } from './config'

// const { PORT = 3000 } = process.env
// const app = express()

// app.set('trust proxy', true)

// app.use(cookieParser())

// app.use(
//     cors({
//         origin: ORIGIN_ALLOW,
//         credentials: true,
//     })
// )

// app.use(serveStatic(path.join(__dirname, 'public')))

// app.use(
//     urlencoded({
//         extended: true,
//         limit: '10kb',
//     })
// )

// app.use(
//     json({
//         limit: '10kb',
//     })
// )

// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 10000,
//     message: 'Слишком много запросов, попробуйте позже',
//     standardHeaders: true,
//     legacyHeaders: false,
// })
// app.use(limiter)

// app.use(routes)

// app.use(errors())

// app.use(errorHandler)

// const startServer = () => {
//     app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
// }

// const connectDbWithRetry = async (retriesLeft = 30) => {
//     try {
//         await mongoose.connect(DB_ADDRESS)
//         console.log('MongoDB connected')
//     } catch (error) {
//         console.error('MongoDB connection failed:', error)
//         if (retriesLeft <= 0) {
//             console.error('MongoDB connection retries exhausted')
//             return
//         }

//         setTimeout(() => {
//             connectDbWithRetry(retriesLeft - 1).catch(() => {})
//         }, 1500)
//     }
// }

// startServer()
// connectDbWithRetry().catch(() => {})
import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'

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
