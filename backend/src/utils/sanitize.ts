import sanitizeHtml from 'sanitize-html'
import { Types } from 'mongoose'

export function sanitizeObject(obj: any, seen = new WeakSet<object>()): any {
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item, seen))
    }

    if (obj && typeof obj === 'object') {
        if (obj instanceof Date) {
            return obj
        }

        if (obj instanceof Types.ObjectId) {
            return obj.toString()
        }

        const plainObject =
            typeof obj.toObject === 'function' ? obj.toObject() : obj

        if (seen.has(plainObject)) {
            return null
        }
        seen.add(plainObject)

        const sanitized: any = {}

        Object.keys(plainObject).forEach((key) => {
            const value = plainObject[key]

            if (key === '_id') {
                sanitized[key] =
                    value instanceof Types.ObjectId ? value.toString() : value
                return
            }

            if (typeof value === 'string') {
                sanitized[key] = sanitizeHtml(value)
            } else {
                sanitized[key] = sanitizeObject(value, seen)
            }
        })

        return sanitized
    }

    return obj
}
