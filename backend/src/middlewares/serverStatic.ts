import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

export default function serveStatic(baseDir: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const safePath = path.normalize(req.path).replace(/^([/\\])+/, '')
        const filePath = path.resolve(baseDir, safePath)
        const resolvedBaseDir = path.resolve(baseDir)

        if (
            filePath !== resolvedBaseDir &&
            !filePath.startsWith(`${resolvedBaseDir}${path.sep}`)
        ) {
            return next()
        }

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return next()
            }

            return res.sendFile(filePath, (error) => {
                if (error) {
                    next(error)
                }
            })
        })
    }
}
