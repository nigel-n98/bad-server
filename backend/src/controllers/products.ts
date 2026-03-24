import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError } from 'mongoose'
import { join } from 'path'
import sanitizeHtml from 'sanitize-html'
import { sanitizeObject } from '../utils/sanitize'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product from '../models/product'
import movingFile from '../utils/movingFile'

const cache = new Map<string, any>()
const CACHE_TTL = 30 * 1000

const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 5 } = req.query

        const cacheKey = `products_${page}_${limit}`

        const cached = cache.get(cacheKey)
        if (cached && cached.expiry > Date.now()) {
            return res.send(cached.data)
        }
        const options = {
            skip: (Number(page) - 1) * Number(limit),
            limit: Number(limit),
        }
        const products = await Product.find({}, null, options).lean()
        const totalProducts = await Product.countDocuments({})
        const totalPages = Math.ceil(totalProducts / Number(limit))
        const response = {
            items: sanitizeObject(products),
            pagination: {
                totalProducts,
                totalPages,
                currentPage: Number(page),
                pageSize: Number(limit),
            },
        }

        cache.set(cacheKey, {
            data: response,
            expiry: Date.now() + CACHE_TTL,
        })

        return res.send(response)
    } catch (err) {
        return next(err)
    }
}

const createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { description, category, price, title, image } = req.body

        const cleanTitle = sanitizeHtml(title || '')
        const cleanDescription = sanitizeHtml(description || '')
        const cleanCategory = sanitizeHtml(category || '')

        if (image) {
            movingFile(
                image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const product = await Product.create({
            description: cleanDescription,
            image,
            category: cleanCategory,
            price,
            title: cleanTitle,
        })
        return res
            .status(constants.HTTP_STATUS_CREATED)
            .send(sanitizeObject(product))
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

const updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const { title, description, category, price, image } = req.body

        const cleanTitle = title ? sanitizeHtml(title) : undefined
        const cleanDescription = description
            ? sanitizeHtml(description)
            : undefined
        const cleanCategory = category ? sanitizeHtml(category) : undefined

        if (image) {
            movingFile(
                image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            {
                ...(cleanTitle && { title: cleanTitle }),
                ...(cleanDescription && { description: cleanDescription }),
                ...(cleanCategory && { category: cleanCategory }),
                ...(price !== undefined && { price }),
                ...(image && { image }),
            },
            { runValidators: true, new: true }
        ).orFail(() => new NotFoundError('Нет товара по заданному id'))

        return res.send(sanitizeObject(product))
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

const deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const product = await Product.findByIdAndDelete(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )
        return res.send(sanitizeObject(product))
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        return next(error)
    }
}

export { createProduct, deleteProduct, getProducts, updateProduct }
