import { Joi, celebrate } from 'celebrate'
import { Types } from 'mongoose'

export const phoneRegExp = /^[+]?[0-9()\-\s]{5,25}$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

export const validateOrderBody = celebrate({
    body: Joi.object().keys({
        items: Joi.array()
            .required()
            .min(1)
            .items(
                Joi.string().custom((value, helpers) => {
                    if (Types.ObjectId.isValid(value)) {
                        return value
                    }
                    return helpers.message({ custom: 'Невалидный id' })
                })
            )
            .messages({
                'array.empty': 'Не указаны товары',
                'any.required': 'Поле "items" обязательно',
            }),

        payment: Joi.string()
            .valid(...Object.values(PaymentType))
            .required()
            .messages({
                'string.valid': 'Недопустимый способ оплаты (card | online)',
                'string.empty': 'Не указан способ оплаты',
                'any.required': 'Поле "payment" обязательно',
            }),

        email: Joi.string().email().required().messages({
            'string.empty': 'Не указан email',
            'string.email': 'Некорректный email',
            'any.required': 'Поле "email" обязательно',
        }),

        phone: Joi.string().required().max(25).pattern(phoneRegExp).messages({
            'string.empty': 'Не указан телефон',
            'string.pattern.base': 'Некорректный формат телефона',
            'string.max': 'Телефон слишком длинный',
            'any.required': 'Поле "phone" обязательно',
        }),

        address: Joi.string().required().max(500).messages({
            'string.empty': 'Не указан адрес',
            'string.max': 'Адрес слишком длинный',
            'any.required': 'Поле "address" обязательно',
        }),

        total: Joi.number().required().min(1).messages({
            'number.min': 'Сумма заказа должна быть больше 0',
            'any.required': 'Поле "total" обязательно',
        }),

        comment: Joi.string().optional().allow('').max(1000).messages({
            'string.max': 'Комментарий слишком длинный',
        }),
    }),
})

export const validateProductBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().required().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "title" - 2',
            'string.max': 'Максимальная длина поля "title" - 30',
            'string.empty': 'Поле "title" должно быть заполнено',
        }),

        image: Joi.object().keys({
            fileName: Joi.string().required(),
            originalName: Joi.string().required(),
        }),

        category: Joi.string().required().messages({
            'string.empty': 'Поле "category" должно быть заполнено',
        }),

        description: Joi.string().required().messages({
            'string.empty': 'Поле "description" должно быть заполнено',
        }),

        price: Joi.number().allow(null),
    }),
})

export const validateProductUpdateBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "title" - 2',
            'string.max': 'Максимальная длина поля "title" - 30',
        }),

        image: Joi.object().keys({
            fileName: Joi.string().required(),
            originalName: Joi.string().required(),
        }),

        category: Joi.string(),

        description: Joi.string(),

        price: Joi.number().allow(null),
    }),
})

export const validateUserBody = celebrate({
    body: Joi.object().keys({
        name: Joi.string().min(2).max(30).required().messages({
            'string.min': 'Минимальная длина имени - 2',
            'string.max': 'Максимальная длина имени - 30',
            'string.empty': 'Поле "name" должно быть заполнено',
        }),

        password: Joi.string().min(6).required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),

        email: Joi.string().required().email().messages({
            'string.empty': 'Поле "email" должно быть заполнено',
            'string.email': 'Некорректный email',
        }),
    }),
})

export const validateAuthentication = celebrate({
    body: Joi.object().keys({
        email: Joi.string().required().email().messages({
            'string.required': 'Поле "email" должно быть заполнено',
            'string.email': 'Некорректный email',
        }),

        password: Joi.string().required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),
    }),
})

export const validateUserUpdate = celebrate({
    body: Joi.object().keys({
        name: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина имени - 2',
            'string.max': 'Максимальная длина имени - 30',
        }),

        email: Joi.string().email().max(254).messages({
            'string.email': 'Некорректный email',
            'string.max': 'Email слишком длинный',
        }),

        phone: Joi.string().max(25).pattern(phoneRegExp).messages({
            'string.pattern.base': 'Некорректный телефон',
            'string.max': 'Телефон слишком длинный',
        }),
    }),
})

export const validateObjectIdParam = (paramName: string) =>
    celebrate({
        params: Joi.object().keys({
            [paramName]: Joi.string()
                .required()
                .custom((value, helpers) => {
                    if (Types.ObjectId.isValid(value)) {
                        return value
                    }
                    return helpers.message({
                        custom: `Невалидный параметр ${paramName}`,
                    })
                }),
        }),
    })

export const validateOrderNumberParam = celebrate({
    params: Joi.object().keys({
        orderNumber: Joi.number().integer().required().messages({
            'number.base': 'orderNumber должен быть числом',
            'any.required': 'orderNumber обязателен',
        }),
    }),
})
