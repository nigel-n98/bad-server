import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import crypto from 'crypto'

import { fileTypeFromBuffer } from 'file-type'

import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.file) {
            return next(
                new BadRequestError('Файл не загружен или не прошёл проверку')
            )
        }

        if (req.file && req.file.size < 2 * 1024) {
            return next(new BadRequestError('Файл слишком маленький'))
        }

        if (req.file && req.file.size > 10 * 1024 * 1024) {
            return next(new BadRequestError('Файл слишком большой'))
        }

        const fileType = await fileTypeFromBuffer(req.file.buffer)

        if (!fileType || !fileType.mime.startsWith('image/')) {
            return next(new BadRequestError('Неверный формат файла'))
        }

        const ext = `.${fileType.ext}`
        const filename = `${crypto.randomUUID()}${ext}`

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${filename}`
            : `/${filename}`

        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
