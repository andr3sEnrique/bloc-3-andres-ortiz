const express = require('express')
const bodyParser = require('body-parser')
const booksrouter = require('./router/books')
const empruntsRouter = require('./router/emprunts')
const usersRouter = require('./router/users')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const path = require('path')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const db = require('./services/database')
const dotenv = require('dotenv')
dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

function authenticateToken(req, res, next) {
    const token = req.cookies.token
    if (!token) return res.sendStatus(401)

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next()
    } else {
        res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' })
    }
}

const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 204
}

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Trop de requêtes, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

const router = express.Router()

router.use(helmet())
router.use(bodyParser.json({ limit: '10mb' }))
router.use(cors(corsOptions))
router.use(cookieParser())
router.use(generalLimiter)
router.use('/api/users', authLimiter);
router.use('/api/users', usersRouter);
router.use('/api/books', booksrouter);
router.use('/api/emprunts', empruntsRouter);

router.post('/api/logout', authenticateToken, (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });
    res.json({ message: 'Déconnexion réussie' });
});

router.get('/api/session', authenticateToken, (req, res) => {
    if (req?.user) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ message: 'Non authentifié' });
    }
});

router.get('/api/statistics', (req, res) => {
    const totalBooksQuery = 'SELECT COUNT(*) AS total_books FROM livres';
    const totalUsersQuery = 'SELECT COUNT(*) AS total_users FROM utilisateurs';

    db.query(totalBooksQuery, (err, booksResult) => {
        if (err) throw err;
        db.query(totalUsersQuery, (err, usersResult) => {
            if (err) throw err;
            res.json({
                total_books: booksResult[0].total_books,
                total_users: usersResult[0].total_users
            });
        });
    });
});

router.post('/api/test-overdue-notifications', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { processOverdueLoans } = require('./mail-cron');
        const result = await processOverdueLoans();
        
        res.json({
            success: result.success,
            message: result.message,
            data: {
                totalOverdue: result.count || 0,
                emailsSent: result.successCount || 0,
                errors: result.errorCount || 0
            }
        });
    } catch (error) {
        console.error('Erreur test notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du test des notifications',
            error: error.message
        });
    }
});

router.get('/api/overdue-loans', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { getOverdueLoans } = require('./mail-cron');
        const overdueLoans = await getOverdueLoans();
        
        res.json({
            success: true,
            count: overdueLoans.length,
            loans: overdueLoans
        });
    } catch (error) {
        console.error('Erreur récupération emprunts en retard:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des emprunts en retard',
            error: error.message
        });
    }
});

router.use('/', express.static(path.join(__dirname, "./webpub")))
router.get('/*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, "./webpub/index.html"))
    }
})

module.exports = router;
