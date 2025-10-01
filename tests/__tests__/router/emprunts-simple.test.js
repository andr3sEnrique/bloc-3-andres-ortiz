const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// Mock de la base de datos
jest.mock('../../../services/database', () => global.mockDb);

describe('Emprunts Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Mock simple de autenticación
    const authenticateToken = (req, res, next) => {
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
      }
      // Simular usuario autenticado
      req.user = { id: 1, email: 'test@example.com', role: 'utilisateur' };
      next();
    };

    // Rutas simplificadas para tests
    app.get('/api/emprunts', authenticateToken, (req, res) => {
      const userId = req.user.id;
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
      
      global.mockDb.query(sql, [userId], (err, results) => {
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
          
          return { ...emprunt, status };
        });
        
        res.json(empruntsWithStatus);
      });
    });

    app.post('/api/emprunts', authenticateToken, (req, res) => {
      const { livre_id, date_retour_prevue } = req.body;
      const utilisateur_id = req.user.id;

      if (!livre_id || !date_retour_prevue) {
        return res.status(400).json({ error: 'Données manquantes' });
      }

      // Verificar que el libro esté disponible
      const checkBookSql = 'SELECT statut FROM livres WHERE id = ?';
      global.mockDb.query(checkBookSql, [livre_id], (err, bookResults) => {
        if (err) {
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (bookResults.length === 0) {
          return res.status(404).json({ error: 'Livre non trouvé' });
        }

        if (bookResults[0].statut !== 'disponible') {
          return res.status(400).json({ error: 'Livre non disponible' });
        }

        // Crear el emprunt
        const insertEmpruntSql = 'INSERT INTO emprunts (livre_id, utilisateur_id, date_retour_prevue) VALUES (?, ?, ?)';
        global.mockDb.query(insertEmpruntSql, [livre_id, utilisateur_id, date_retour_prevue], (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Erreur lors de la création de l\'emprunt' });
          }

          // Actualizar el statut del libro
          const updateBookSql = 'UPDATE livres SET statut = ? WHERE id = ?';
          global.mockDb.query(updateBookSql, ['emprunté', livre_id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Erreur lors de la mise à jour du livre' });
            }

            res.status(201).json({ 
              message: 'Emprunt créé avec succès',
              emprunt_id: result.insertId 
            });
          });
        });
      });
    });

    app.put('/api/emprunts/:id/retourner', authenticateToken, (req, res) => {
      const empruntId = req.params.id;
      const userId = req.user.id;
      
      // Verificar que el emprunt pertenece al usuario
      const checkEmpruntSql = `
        SELECT e.*, l.id as livre_id 
        FROM emprunts e 
        JOIN livres l ON e.livre_id = l.id 
        WHERE e.id = ? AND e.utilisateur_id = ? AND e.date_retour_effective IS NULL
      `;
      
      global.mockDb.query(checkEmpruntSql, [empruntId, userId], (err, empruntResults) => {
        if (err) {
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (empruntResults.length === 0) {
          return res.status(404).json({ error: 'Emprunt non trouvé ou déjà retourné' });
        }

        const emprunt = empruntResults[0];
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Marquer l'emprunt comme retourné
        const updateEmpruntSql = 'UPDATE emprunts SET date_retour_effective = ? WHERE id = ?';
        global.mockDb.query(updateEmpruntSql, [currentDate, empruntId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'emprunt' });
          }

          // Marquer le livre comme disponible
          const updateBookSql = 'UPDATE livres SET statut = ? WHERE id = ?';
          global.mockDb.query(updateBookSql, ['disponible', emprunt.livre_id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Erreur lors de la mise à jour du livre' });
            }

            res.json({ 
              message: 'Livre retourné avec succès',
              date_retour_effective: currentDate
            });
          });
        });
      });
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/emprunts', () => {
    test('should return user emprunts with status', async () => {
      const mockEmprunts = [
        {
          id: 1,
          livre_id: 1,
          utilisateur_id: 1,
          date_emprunt: '2024-01-01',
          date_retour_prevue: '2024-01-15',
          date_retour_effective: null,
          titre: 'Test Book 1',
          auteur: 'Test Author 1',
          photo_url: 'http://example.com/book1.jpg'
        },
        {
          id: 2,
          livre_id: 2,
          utilisateur_id: 1,
          date_emprunt: '2023-12-01',
          date_retour_prevue: '2023-12-15',
          date_retour_effective: '2023-12-14',
          titre: 'Test Book 2',
          auteur: 'Test Author 2',
          photo_url: 'http://example.com/book2.jpg'
        }
      ];

      global.mockDb.query.mockImplementationOnce((sql, params, callback) => {
        callback(null, mockEmprunts);
      });

      const response = await request(app)
        .get('/api/emprunts')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      

      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[1]).toHaveProperty('status');
      expect(response.body[1].status).toBe('retourné');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/emprunts');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    test('should handle database errors', async () => {
      global.mockDb.query.mockImplementationOnce((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/emprunts')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    test('should calculate delayed status correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 días atrás

      const mockEmprunts = [
        {
          id: 1,
          livre_id: 1,
          utilisateur_id: 1,
          date_emprunt: '2024-01-01',
          date_retour_prevue: pastDate.toISOString().split('T')[0],
          date_retour_effective: null,
          titre: 'Overdue Book',
          auteur: 'Test Author',
          photo_url: 'http://example.com/book.jpg'
        }
      ];

      global.mockDb.query.mockImplementationOnce((sql, params, callback) => {
        callback(null, mockEmprunts);
      });

      const response = await request(app)
        .get('/api/emprunts')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body[0].status).toBe('delayed');
    });
  });

  describe('POST /api/emprunts', () => {
    const validEmpruntData = {
      livre_id: 1,
      date_retour_prevue: '2024-02-01'
    };

    test('should create emprunt successfully', async () => {
      // Mock database responses
      global.mockDb.query
        .mockImplementationOnce((sql, params, callback) => {
          // Check book availability
          callback(null, [{ statut: 'disponible' }]);
        })
        .mockImplementationOnce((sql, params, callback) => {
          // Insert emprunt
          callback(null, { insertId: 1 });
        })
        .mockImplementationOnce((sql, params, callback) => {
          // Update book status
          callback(null, { affectedRows: 1 });
        });

      const response = await request(app)
        .post('/api/emprunts')
        .set('Cookie', ['token=valid-jwt-token'])
        .send(validEmpruntData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Emprunt créé avec succès');
      expect(response.body).toHaveProperty('emprunt_id', 1);
      expect(global.mockDb.query).toHaveBeenCalledTimes(3);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/emprunts')
        .send(validEmpruntData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    test('should validate required fields', async () => {
      const invalidData = {
        livre_id: null,
        date_retour_prevue: null
      };

      const response = await request(app)
        .post('/api/emprunts')
        .set('Cookie', ['token=valid-jwt-token'])
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Données manquantes');
    });

    test('should return 404 if book not found', async () => {
      // Mock database response - no book found
      global.mockDb.query.mockImplementationOnce((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .post('/api/emprunts')
        .set('Cookie', ['token=valid-jwt-token'])
        .send(validEmpruntData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Livre non trouvé');
    });

    test('should return 400 if book not available', async () => {
      // Mock database response - book not available
      global.mockDb.query.mockImplementationOnce((sql, params, callback) => {
        callback(null, [{ statut: 'emprunté' }]);
      });

      const response = await request(app)
        .post('/api/emprunts')
        .set('Cookie', ['token=valid-jwt-token'])
        .send(validEmpruntData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Livre non disponible');
    });
  });

  describe('PUT /api/emprunts/:id/retourner', () => {
    test('should return book successfully', async () => {
      const mockEmprunt = {
        id: 1,
        livre_id: 1,
        utilisateur_id: 1,
        date_retour_effective: null
      };

      global.mockDb.query
        .mockImplementationOnce((sql, params, callback) => {
          // Check emprunt exists and belongs to user
          callback(null, [mockEmprunt]);
        })
        .mockImplementationOnce((sql, params, callback) => {
          // Update emprunt with return date
          callback(null, { affectedRows: 1 });
        })
        .mockImplementationOnce((sql, params, callback) => {
          // Update book status to available
          callback(null, { affectedRows: 1 });
        });

      const response = await request(app)
        .put('/api/emprunts/1/retourner')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Livre retourné avec succès');
      expect(response.body).toHaveProperty('date_retour_effective');
      expect(global.mockDb.query).toHaveBeenCalledTimes(3);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/emprunts/1/retourner');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    test('should return 404 if emprunt not found', async () => {
      // Mock database response - no emprunt found
      global.mockDb.query.mockImplementationOnce((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .put('/api/emprunts/999/retourner')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Emprunt non trouvé ou déjà retourné');
    });

    test('should handle database errors', async () => {
      global.mockDb.query.mockImplementationOnce((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .put('/api/emprunts/1/retourner')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
  });
});
