const { CronJob } = require('cron');
const { processOverdueLoans } = require('./mail-cron');

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
  true,
  'Europe/Paris'
);

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

console.log('📧 Système de notification des emprunts en retard initialisé');
console.log('⏰ Prochaine exécution programmée:', overdueNotificationJob.nextDate().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

module.exports = {
  overdueNotificationJob,
  runManualCheck
};
