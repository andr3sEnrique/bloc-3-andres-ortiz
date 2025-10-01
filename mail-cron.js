const nodemailer = require("nodemailer");
const db = require('./services/database');

const createSMTPTransporter = () => {
  const smtpConfig = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "oenrique23415@gmail.com",
      pass: "npra sbva znbm ymzv",
    },
  };
  return nodemailer.createTransporter(smtpConfig);
};

const getOverdueLoans = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        e.id as emprunt_id,
        e.date_emprunt,
        e.date_retour_prevue,
        u.nom,
        u.prenom,
        u.email,
        l.titre,
        l.auteur,
        DATEDIFF(CURDATE(), e.date_retour_prevue) as jours_retard
      FROM emprunts e
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      JOIN livres l ON e.livre_id = l.id
      WHERE e.date_retour_effective IS NULL 
        AND e.date_retour_prevue < CURDATE()
      ORDER BY e.date_retour_prevue ASC
    `;
    
    db.query(sql, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Función para enviar email de recordatorio
const sendOverdueNotification = async (userInfo) => {
  const transporter = createSMTPTransporter();
  
  const { nom, prenom, email, titre, auteur, date_retour_prevue, jours_retard } = userInfo;
  
  const options = {
    from: "oenrique23415@gmail.com",
    to: email,
    subject: "📚 Rappel - Livre en retard - Librairie XYZ",
    html: `
    <center>
      <table style="width: 100%; max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border-collapse: collapse;">
        <tr>
          <td style="background-color: #dc3545; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📚 Librairie XYZ</h1>
            <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Rappel de retour de livre</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #ffffff; padding: 30px;">
            <h2 style="color: #dc3545; margin-bottom: 20px;">Bonjour ${prenom} ${nom},</h2>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #721c24; margin: 0; font-weight: bold;">
                ⚠️ Votre emprunt est en retard de ${jours_retard} jour(s)
              </p>
            </div>
            
            <h3 style="color: #2c3e50; margin-bottom: 15px;">Détails du livre emprunté :</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Titre :</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${titre}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Auteur :</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${auteur}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Date de retour prévue :</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; color: #dc3545; font-weight: bold;">${new Date(date_retour_prevue).toLocaleDateString('fr-FR')}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Jours de retard :</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; color: #dc3545; font-weight: bold;">${jours_retard} jour(s)</td>
              </tr>
            </table>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #0c5460; margin: 0;">
                <strong>Action requise :</strong> Veuillez retourner ce livre dès que possible à la librairie pour éviter des frais supplémentaires.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/emprunts" style="display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
                Voir mes emprunts
              </a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin-top: 20px;">
              Si vous avez déjà retourné ce livre, veuillez ignorer ce message. 
              Pour toute question, contactez-nous à la librairie.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6c757d;">
            <p style="margin: 0;">© 2025 Librairie XYZ. Tous droits réservés.</p>
            <p style="margin: 5px 0 0 0;">
              Cet email a été envoyé automatiquement. Merci de ne pas répondre à ce message.
            </p>
          </td>
        </tr>
      </table>
    </center>
    `,
  };
  
  await transporter.sendMail(options);
};

const processOverdueLoans = async () => {
  try {
    console.log('🔍 Recherche des emprunts en retard...');
    
    const overdueLoans = await getOverdueLoans();
    
    if (overdueLoans.length === 0) {
      console.log('✅ Aucun emprunt en retard trouvé.');
      return { success: true, count: 0, message: 'Aucun emprunt en retard' };
    }
    
    console.log(`📧 ${overdueLoans.length} emprunt(s) en retard trouvé(s). Envoi des notifications...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const loan of overdueLoans) {
      try {
        await sendOverdueNotification(loan);
        console.log(`✅ Email envoyé à ${loan.prenom} ${loan.nom} (${loan.email}) pour le livre "${loan.titre}"`);
        successCount++;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erreur envoi email à ${loan.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`📊 Résumé: ${successCount} emails envoyés, ${errorCount} erreurs`);
    
    return {
      success: true,
      count: overdueLoans.length,
      successCount,
      errorCount,
      message: `${successCount} notifications envoyées sur ${overdueLoans.length} emprunts en retard`
    };
    
  } catch (error) {
    console.error('❌ Erreur lors du traitement des emprunts en retard:', error);
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors du traitement des emprunts en retard'
    };
  }
};

// Fonction de test (garde l'ancienne pour compatibilité)
const sendTestMail = async (name, counter) => {
  const transporter = createSMTPTransporter();
  const options = {
    from: "oenrique23415@gmail.com",
    to: "services@nebulia.tech",
    subject: "Test avec mot de passe Brut",
    text: "Hello there, this is a test email",
    html: `<center>
<table style="width: 100%; max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border-collapse: collapse;">
  <tr>
    <td style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
      <img src="https://via.placeholder.com/150x50?text=Logo+Entreprise" alt="Logo" style="max-width: 150px;">
    </td>
  </tr>
  <tr>
    <td style="background-color: #ffffff; padding: 30px; text-align: center;">
      <h1 style="color: #2c3e50; margin-bottom: 20px;">Bonjour, c'est ${name}, voici le compteur : ${counter}</h1>
    
      <p style="color: #7f8c8d; font-size: 16px; line-height: 1.5;">
        Ceci est un <strong>mail test</strong> pour vérifier l'affichage et le style.
        Tu peux personnaliser ce modèle avec tes propres couleurs, images et contenu.
      </p>
      <div style="margin: 25px 0; background-color: #e8f4fc; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
        <p style="color: #2980b9; margin: 0;">
          <strong>Message important :</strong> Ce mail est un exemple de design responsive et moderne.
        </p>
      </div>
      <a href="https://exemple.com" style="display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; margin-top: 20px;">
        Découvrir plus
      </a>
    </td>
  </tr>
  <tr>
    <td style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #7f8c8d;">
      <p>© 2025 [Nom de ton entreprise]. Tous droits réservés.</p>
      <p>
        <a href="https://exemple.com/confidentialite" style="color: #3498db; text-decoration: none; margin: 0 10px;">Confidentialité</a> |
        <a href="https://exemple.com/contact" style="color: #3498db; text-decoration: none; margin: 0 10px;">Contact</a>
      </p>
    </td>
  </tr>
</table>
</center>`,
  };
  await transporter.sendMail(options);
};

// Función legacy para compatibilidad
const linkStart = async (counter) => {
  try {
    // Cambiar a la nueva funcionalidad
    const result = await processOverdueLoans();
    console.log("Traitement des emprunts en retard terminé:", result.message);
    return result;
  } catch (error) {
    console.log("Erreur:", error);
    throw error;
  }
};

module.exports = { 
  linkStart, 
  processOverdueLoans, 
  sendTestMail,
  getOverdueLoans,
  sendOverdueNotification 
};
