import { ErrorRequestHandler } from 'express'

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).send({ message: 'Недействительный CSRF токен' })
    }
    const statusCode = err.statusCode || 500
    const message =
        statusCode === 500 ? 'На сервере произошла ошибка' : err.message
    if (process.env.NODE_ENV !== 'production') {
        console.error(err)
    } else {
        console.error(err.message)
    }

    res.status(statusCode).send({ message })
}

export default errorHandler
