const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator');
const db = require('./../services/database')
const { authenticateToken, isAdmin } = require('./utils');
const dotenv = require('dotenv')
dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

const fieldValidations = [
    body('name').optional().trim().isLength({ min: 5 }).isString(),
    body('prenom').optional().trim().isLength({ min: 5 }).isString(),
    body('email').optional().trim().isEmail(),
    body('password').optional().trim().isLength({ min: 6 }).isString(),
    body('role').optional().trim().isIn(['admin', 'utilisateur'])
  ];

const userExists = (email) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM utilisateurs WHERE email = ?'
        db.query(sql, [email], (err, results) => {
            if (err) {
                reject(err)
            } else {
                resolve(results.length > 0)
            }
        })
    })
}



router
.get('/',authenticateToken, isAdmin, (_, res) => {
    const sql = 'SELECT id, nom, prenom, email, role, created_at FROM utilisateurs'
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(results)
    })
})

.post('/register', fieldValidations, async (req, res) => {
    try {
        const { name, prenom, email, password, role } = req.body
        const user = await userExists(email)
        if (user) {
            return res.status(409).send('Utilisateur existant')
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const sql = 'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)'
        db.query(sql, [name, prenom, email, hashedPassword, role || 'utilisateur'], (err, result) => {
            if (err) {
                console.error(err)
                res.status(500).send('Problème SQL')
            }
            else res.send('Utilisateur enregistré')
        })
    } catch (error) {
        console.error('Error en register:', error)
        res.status(500).send('Erreur serveur')
    }
})

.put('/:id', authenticateToken, fieldValidations, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { nom, prenom, email, role } = req.body
    const sql = 'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ?, role = ? WHERE id = ?'
    db.query(sql, [nom, prenom, email, role, req.params.id], (err) => {
        if (err) throw err
        res.send('Utilisateur mis à jour')
    })
})

.post('/login', fieldValidations, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const sql = 'SELECT * FROM utilisateurs WHERE email = ?'
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: 'Utilisateur non trouvé' })
        }
        const user = results[0]
        const isMatch = await bcrypt.compare(password, user.mot_de_passe)
        if (!isMatch) {
            return res.status(400).json({ error: 'Mot de passe incorrect' })
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' })
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true en producción
            sameSite: 'lax',
            path: '/',
            maxAge: 2 * 60 * 60 * 1000 // 2 horas en milliseconds
        })
        
        // No devolver información sensible
        res.json({ 
            message: 'Connexion réussie',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        })
    })
})

.get('/:id', authenticateToken, (req, res) => {
    const sql = 'SELECT id, nom, prenom, email, role, created_at FROM utilisateurs WHERE id = ?'
    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(result)
    })
})
.get('/user-role', authenticateToken, (req, res) => {
    res.json({ role: req.user.role });
})

module.exports = router
