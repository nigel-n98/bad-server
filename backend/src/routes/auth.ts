import csurf from 'csurf'
import { Router } from 'express'

import {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'

import auth from '../middlewares/auth'
import {
    validateAuthentication,
    validateUserBody,
    validateUserUpdate,
} from '../middlewares/validations'

const authRouter = Router()

const csrfProtection = csurf({ cookie: true })

authRouter.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() })
})

authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', auth, validateUserUpdate, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)

authRouter.post('/login', csrfProtection, validateAuthentication, login)

authRouter.get('/token', refreshAccessToken)
authRouter.post('/logout', logout)

// 🔥 и тут
authRouter.post('/register', csrfProtection, validateUserBody, register)

export default authRouter
