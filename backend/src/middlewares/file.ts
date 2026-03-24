import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import BadRequestError from '../errors/bad-request-error'

const storage = multer.memoryStorage()

const allowedTypes = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
]

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new BadRequestError('Недопустимый тип файла'))
    }

    return cb(null, true)
}

const limits = {
    fileSize: 10 * 1024 * 1024,
}

export default multer({
    storage,
    fileFilter,
    limits,
})
