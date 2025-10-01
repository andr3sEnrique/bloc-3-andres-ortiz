const { CronJob } = require('cron');
const { processOverdueLoans } = require('./mail-cron');

// Cron job para notificaciones de préstamos vencidos
const overdueNotificationJob = new CronJob(
  '0 20 17 * * *',
  async function () {
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    console.log(`\n🕘 [${now}] Démarrage du job de notification des emprunts en retard...`);
    
    try {
      const result = await processOverdueLoans();
      
      if (result.success) {
        console.log(`✅ Job terminé avec succès: ${result.message}`);
        
        if (result.count > 0) {
          console.log(`📊 Statistiques:`);
          console.log(`   - Emprunts en retard trouvés: ${result.count}`);
          console.log(`   - Emails envoyés avec succès: ${result.successCount}`);
          console.log(`   - Erreurs d'envoi: ${result.errorCount}`);
        }
      } else {
        console.error(`❌ Job échoué: ${result.message}`);
        if (result.error) {
          console.error(`   Détail de l'erreur: ${result.error}`);
        }
      }
      
    } catch (err) {
      console.error('❌ Erreur critique lors de l\'exécution du job:', err);
    }
    
    console.log(`🏁 [${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] Job terminé.\n`);
  },
  () => {
    console.log('📧 Job de notification des emprunts en retard arrêté.');
  },
  true, // Démarrer automatiquement
  'Europe/Paris' // Fuseau horaire
);

// Job de test (optionnel) - s'exécute toutes les heures pour les tests
const testJob = new CronJob(
  '0 0 * * * *', // Toutes les heures à la minute 0
  async function () {
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    console.log(`🧪 [${now}] Test job - Vérification du système de notifications...`);
    
    try {
      // Juste vérifier la connexion à la base de données
      const { getOverdueLoans } = require('./mail-cron');
      const overdueLoans = await getOverdueLoans();
      console.log(`📊 Emprunts en retard actuellement: ${overdueLoans.length}`);
      
      if (overdueLoans.length > 0) {
        console.log(`📋 Détails:`);
        overdueLoans.forEach((loan, index) => {
          console.log(`   ${index + 1}. ${loan.prenom} ${loan.nom} - "${loan.titre}" (${loan.jours_retard} jour(s) de retard)`);
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du test:', error.message);
    }
  },
  null,
  false, // Ne pas démarrer automatiquement (pour les tests seulement)
  'Europe/Paris'
);

// Fonction pour démarrer le job de test manuellement
const startTestJob = () => {
  console.log('🧪 Démarrage du job de test...');
  testJob.start();
};

// Fonction pour arrêter le job de test
const stopTestJob = () => {
  console.log('🛑 Arrêt du job de test...');
  testJob.stop();
};

// Fonction pour exécuter une vérification manuelle
const runManualCheck = async () => {
  console.log('🔍 Exécution manuelle de la vérification des emprunts en retard...');
  try {
    const result = await processOverdueLoans();
    console.log('✅ Vérification manuelle terminée:', result.message);
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification manuelle:', error);
    throw error;
  }
};

// Logs de démarrage
console.log('📧 Système de notification des emprunts en retard initialisé');
console.log('⏰ Prochaine exécution programmée:', overdueNotificationJob.nextDate().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

// Exporter les fonctions utiles
module.exports = {
  overdueNotificationJob,
  testJob,
  startTestJob,
  stopTestJob,
  runManualCheck
};
