const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const xss = require('xss')
const db = require('./../services/database')
const { authenticateToken, isAdmin } = require('./utils')

// Validaciones para libros
const bookValidations = [
    body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Titre requis (1-255 caractères)'),
    body('author').trim().isLength({ min: 1, max: 255 }).withMessage('Auteur requis (1-255 caractères)'),
    body('date_publication').optional().isISO8601().withMessage('Date de publication invalide'),
    body('published_date').optional().isISO8601().withMessage('Date de publication invalide'),
    body('isbn').trim().isLength({ min: 10, max: 17 }).withMessage('ISBN requis (10-17 caractères)'),
    body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description requise (1-1000 caractères)'),
    body('status').optional().isIn(['disponible', 'emprunté']).withMessage('Statut invalide'),
    body('cover').optional().isURL().withMessage('URL de couverture invalide'),
    body('photo_url').optional().isURL().withMessage('URL de photo invalide')
]


const sanitizeBookData = (data) => {
    return {
        title: xss(data.title),
        author: xss(data.author),
        date_publication: data.date_publication || data.published_date,
        isbn: xss(data.isbn),
        description: xss(data.description),
        status: data.status || 'disponible',
        photo_url: xss(data.cover || data.photo_url)
    }
}

router
// GET público - listar todos los libros
.get('/', (_, res) => {
    const sql = 'SELECT * FROM livres'
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err)
            return res.status(500).json({ error: 'Erreur serveur' })
        }
        res.json(results)
    })
})

// GET público - obtener libro por ID
.get('/:id', (req, res) => {
    const sql = 'SELECT * FROM livres WHERE id = ?'
    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error('Database error:', err)
            return res.status(500).json({ error: 'Erreur serveur' })
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Livre non trouvé' })
        }
        res.json(result[0])
    })
})

// POST protegido - crear libro (solo admin)
.post('/', authenticateToken, isAdmin, bookValidations, (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const sanitizedData = sanitizeBookData(req.body)
    const { title, author, date_publication, isbn, description, status, photo_url } = sanitizedData

    const sql = 'INSERT INTO livres (titre, auteur, date_publication, isbn, description, statut, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
    db.query(sql, [title, author, date_publication, isbn, description, status, photo_url], (err, result) => {
        if (err) {
            console.error('Database error:', err)
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'ISBN déjà existant' })
            }
            return res.status(500).json({ error: 'Erreur lors de la création du livre' })
        }
        res.status(201).json({ 
            message: 'Livre ajouté avec succès',
            id: result.insertId 
        })
    })
})

// PUT protegé - modifier livre (solo admin)
.put('/:id', authenticateToken, isAdmin, bookValidations, (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const sanitizedData = sanitizeBookData(req.body)
    const { title, author, date_publication, isbn, description, status, photo_url } = sanitizedData

    // Verificar que el libro existe
    const checkSql = 'SELECT id FROM livres WHERE id = ?'
    db.query(checkSql, [req.params.id], (err, checkResult) => {
        if (err) {
            console.error('Database error:', err)
            return res.status(500).json({ error: 'Erreur serveur' })
        }
        if (checkResult.length === 0) {
            return res.status(404).json({ error: 'Livre non trouvé' })
        }

        const sql = 'UPDATE livres SET titre = ?, auteur = ?, date_publication = ?, isbn = ?, description = ?, statut = ?, photo_url = ? WHERE id = ?'
        db.query(sql, [title, author, date_publication, isbn, description, status, photo_url, req.params.id], (err, result) => {
            if (err) {
                console.error('Database error:', err)
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'ISBN déjà existant' })
                }
                return res.status(500).json({ error: 'Erreur lors de la mise à jour du livre' })
            }
            res.json({ message: 'Livre mis à jour avec succès' })
        })
    })
})

// DELETE protegé - eliminar libro (solo admin)
.delete('/:id', authenticateToken, isAdmin, (req, res) => {
    // Verificar que el libro existe
    const checkSql = 'SELECT id FROM livres WHERE id = ?'
    db.query(checkSql, [req.params.id], (err, checkResult) => {
        if (err) {
            console.error('Database error:', err)
            return res.status(500).json({ error: 'Erreur serveur' })
        }
        if (checkResult.length === 0) {
            return res.status(404).json({ error: 'Livre non trouvé' })
        }

        // Verificar si el libro está emprunté
        const empruntsCheckSql = 'SELECT id FROM emprunts WHERE livre_id = ? AND date_retour_effective IS NULL'
        db.query(empruntsCheckSql, [req.params.id], (err, empruntsResult) => {
            if (err) {
                console.error('Database error:', err)
                return res.status(500).json({ error: 'Erreur serveur' })
            }
            if (empruntsResult.length > 0) {
                return res.status(400).json({ error: 'Impossible de supprimer un livre actuellement emprunté' })
            }

            const sql = 'DELETE FROM livres WHERE id = ?'
            db.query(sql, [req.params.id], (err) => {
                if (err) {
                    console.error('Database error:', err)
                    return res.status(500).json({ error: 'Erreur lors de la suppression du livre' })
                }
                res.json({ message: 'Livre supprimé avec succès' })
            })
        })
    })
})

module.exports = router
