const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator');
const db = require('./../services/database')
const { authenticateToken } = require('./utils');
const dotenv = require('dotenv')
dotenv.config()


const fieldValidations = [
    body('livre_id').notEmpty().isInt().withMessage('ID du livre requis'),
    body('date_retour_prevue').notEmpty().isISO8601().withMessage('Date de retour prévue requise')
];

router
.get('/',authenticateToken, (req, res) => {
    const userId = req.user.id;
    console.log('User ID:', userId);
    
    const sql = `
        SELECT 
            e.id,
            e.livre_id,
            e.utilisateur_id,
            e.date_emprunt,
            e.date_retour_prevue,
            e.date_retour_effective,
            l.titre,
            l.auteur,
            l.photo_url
        FROM emprunts e
        JOIN livres l ON e.livre_id = l.id
        WHERE e.utilisateur_id = ?
        ORDER BY e.date_emprunt DESC
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        const empruntsWithStatus = results.map(emprunt => {
            let status = 'en cours';
            const today = new Date();
            const dateRetourPrevue = new Date(emprunt.date_retour_prevue);
            
            if (emprunt.date_retour_effective) {
                status = 'retourné';
            } else if (today > dateRetourPrevue) {
                status = 'delayed';
            }
            
            return {
                ...emprunt,
                status
            };
        });
        
        res.json(empruntsWithStatus);
    })
})

.post('/', authenticateToken, fieldValidations, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { livre_id, date_retour_prevue } = req.body;
        const utilisateur_id = req.user.id;

        // Verificar que el libro esté disponible
        const checkBookSql = 'SELECT statut FROM livres WHERE id = ?';
        db.query(checkBookSql, [livre_id], (err, bookResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            for (const book of bookResults) {
                if (book.statut !== 'disponible') {
                    return res.status(400).json({ error: 'Livre non disponible' });
                }
            }

            if (bookResults.length === 0) {
                return res.status(404).json({ error: 'Livre non trouvé' });
            }

            if (bookResults[0].statut !== 'disponible') {
                return res.status(400).json({ error: 'Livre non disponible' });
            }

            // Crear el emprunt
            const insertEmpruntSql = 'INSERT INTO emprunts (livre_id, utilisateur_id, date_retour_prevue) VALUES (?, ?, ?)';
            db.query(insertEmpruntSql, [livre_id, utilisateur_id, date_retour_prevue], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erreur lors de la création de l\'emprunt' });
                }

                // Actualizar el statut del libro a 'emprunté'
                const updateBookSql = 'UPDATE livres SET statut = ? WHERE id = ?';
                db.query(updateBookSql, ['emprunté', livre_id], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Erreur lors de la mise à jour du livre' });
                    }

                    res.status(201).json({ 
                        message: 'Emprunt créé avec succès',
                        emprunt_id: result.insertId 
                    });
                });
            });
        });
    } catch (error) {
        console.error('Erreur en emprunt:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
})

.put('/:id/retourner', authenticateToken, (req, res) => {
    try {
        const empruntId = req.params.id;
        const userId = req.user.id;
        
        // Verificar que el emprunt pertenece al usuario y no ha sido retournado
        const checkEmpruntSql = `
            SELECT e.*, l.id as livre_id 
            FROM emprunts e 
            JOIN livres l ON e.livre_id = l.id 
            WHERE e.id = ? AND e.utilisateur_id = ? AND e.date_retour_effective IS NULL
        `;
        
        db.query(checkEmpruntSql, [empruntId, userId], (err, empruntResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            if (empruntResults.length === 0) {
                return res.status(404).json({ error: 'Emprunt non trouvé ou déjà retourné' });
            }

            const emprunt = empruntResults[0];
            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Marquer l'emprunt comme retourné
            const updateEmpruntSql = 'UPDATE emprunts SET date_retour_effective = ? WHERE id = ?';
            db.query(updateEmpruntSql, [currentDate, empruntId], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'emprunt' });
                }

                // Marquer le livre comme disponible
                const updateBookSql = 'UPDATE livres SET statut = ? WHERE id = ?';
                db.query(updateBookSql, ['disponible', emprunt.livre_id], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Erreur lors de la mise à jour du livre' });
                    }

                    res.json({ 
                        message: 'Livre retourné avec succès',
                        date_retour_effective: currentDate
                    });
                });
            });
        });
    } catch (error) {
        console.error('Erreur en retour:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
})

module.exports = router
