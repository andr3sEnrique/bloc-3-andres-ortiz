require('dotenv').config()
const express = require('express')
const server = require('./server')
const path = require('path')

const app = express()

// Inicializar el sistema de notificaciones de préstamos vencidos
const { overdueNotificationJob } = require('./cron-job')

app.use('/', server)

app.listen(3000, () => {
    console.info('🚀 Serveur démarré sur le port 3000')
    console.info('📧 Système de notifications des emprunts en retard activé')
    console.info('⏰ Prochaine vérification programmée:', overdueNotificationJob.nextDate().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }))
})
