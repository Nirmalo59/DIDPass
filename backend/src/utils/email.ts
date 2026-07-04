import nodemailer from 'nodemailer';
import logger from './audit';

let transporter: nodemailer.Transporter | null = null;

/**
 * Initializes the Nodemailer transporter.
 * If env values are not set, it creates a test account on smtp.ethereal.email.
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST || 'smtp.ethereal.email';
  const port = parseInt(process.env.EMAIL_PORT || '587');
  let user = process.env.EMAIL_USER;
  let pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    logger.info('📧 Creating Ethereal SMTP test account for notifications...');
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    logger.info(`📧 Ethereal Test Account: User: ${user}`);
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });

  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email notification.
 */
export async function sendEmail(options: EmailOptions): Promise<{ messageId: string; previewUrl?: string | false }> {
  try {
    const mailTransporter = await getTransporter();
    const from = process.env.EMAIL_FROM || '"DIDPass Notifications" <noreply@didpass.io>';

    const info = await mailTransporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`📧 Email sent! Message ID: ${info.messageId}`);
    if (previewUrl) {
      logger.info(`📧 Preview sent email at: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Formats the credential issuance email.
 */
export function formatCredentialEmail(holderName: string, credentialType: string, claimLink: string, qrCodeText: string): string {
  const typeName = credentialType === 'student_id' ? 'Student ID Credential' : 'Bank KYC Credential';
  
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; color: #333333;">
      <div style="text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 20px;">
        <span style="font-size: 32px;">🛡️</span>
        <h1 style="margin: 10px 0 0 0; color: #1a1a1a; font-size: 24px;">DIDPass Credential Issued</h1>
      </div>
      
      <div style="padding: 20px 0; line-height: 1.6;">
        <p>Dear <strong>${holderName}</strong>,</p>
        <p>A new secure <strong>${typeName}</strong> has been issued to you by your institution on the DIDPass network.</p>
        
        <div style="background-color: #f3f4f6; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Credential Type:</strong> ${typeName}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Verification Status:</strong> Ready to claim</p>
        </div>

        <p>To claim this credential and link it to your MetaMask wallet, please click the secure claim link below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${claimLink}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);">Claim Your Credential</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; text-align: center;">Or scan the QR code below using the DIDPass mobile wallet or scanner:</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <div style="border: 2px dashed #d1d5db; padding: 20px; display: inline-block; background-color: #fafafa; border-radius: 8px;">
            <!-- Simple simulated QR Code using text blocks and CSS -->
            <div style="font-family: monospace; font-size: 8px; line-height: 8px; letter-spacing: -1px; white-space: pre; color: black; background: white; padding: 10px; border: 1px solid #ccc;">
████████████  ██      ████████████
██        ██  ██  ██  ██        ██
██  ████  ██  ██      ██  ████  ██
██  ████  ██  ██████  ██  ████  ██
██        ██  ██  ██  ██        ██
████████████  ██████  ████████████
              ██  ██              
████  ████    ██  ██  ████████████
  ██    ██  ██  ██      ██    ██  
██  ████  ████  ████    ██  ██    
              ██  ████  ██  ██  ██
████████████  ██  ██  ██  ██  ██  
██        ██  ████    ██████    ██
██  ████  ██    ████  ██    ██    
██  ████  ██  ██████  ████  ████  
██        ██  ██    ████████  ██  
████████████  ████████  ████      
            </div>
            <div style="margin-top: 10px; font-size: 11px; color: #6b7280;">Hash: ${qrCodeText.slice(0, 10)}...${qrCodeText.slice(-10)}</div>
          </div>
        </div>

        <p>Once claimed, you can use your wallet to log into university portals, banks, and other services instantly without passwords.</p>
      </div>

      <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
        <p>This is an automated security notification from DIDPass. Do not reply to this email.</p>
        <p>© 2026 DIDPass. Decentralized Identity and Verifiable Credentials for Nepal.</p>
      </div>
    </div>
  `;
}
