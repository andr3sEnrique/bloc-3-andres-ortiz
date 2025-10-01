const nodemailer = require("nodemailer");
const db = require('./services/database');
const dotenv = require('dotenv')
dotenv.config()

const createSMTPTransporter = () => {
  const smtpConfig = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL,
      pass: process.env.MAIL_KEY,
    },
  };
  return nodemailer.createTransport(smtpConfig);
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

module.exports = { 
  processOverdueLoans, 
  getOverdueLoans,
  sendOverdueNotification 
};
