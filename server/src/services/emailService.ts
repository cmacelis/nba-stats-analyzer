import nodemailer from 'nodemailer';
import { emailTemplates } from '../templates/emailTemplates';

interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(config: EmailConfig) {
    try {
      await this.transporter.sendMail(config);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendDailyDigest(userData: {
    email: string;
    username: string;
    news: any[];
    games: any[];
    playerUpdates: any[];
  }) {
    const template = emailTemplates.dailyDigest;
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'nba-stats@example.com',
      to: userData.email,
      subject: template.subject,
      html: template.generateHtml(userData)
    });
  }

  async sendAchievementNotification(userData: {
    email: string;
    username: string;
    achievement: {
      title: string;
      description: string;
    };
  }) {
    const template = emailTemplates.achievementUnlocked;
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'nba-stats@example.com',
      to: userData.email,
      subject: template.subject,
      html: template.generateHtml(userData)
    });
  }

  async sendWeeklyNewsletter(userData: {
    email: string;
    username: string;
    weeklyStats: any;
    topPlayers: any[];
    predictions: any[];
  }) {
    const template = emailTemplates.weeklyNewsletter;
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'nba-stats@example.com',
      to: userData.email,
      subject: template.subject,
      html: template.generateHtml(userData)
    });
  }

  async sendGameAlert(userData: {
    email: string;
    username: string;
    game: {
      homeTeam: string;
      awayTeam: string;
      time: string;
      venue: string;
      keyPlayers: string[];
    };
  }) {
    const template = emailTemplates.gameAlert;
    const teams = `${userData.game.homeTeam} vs ${userData.game.awayTeam}`;
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'nba-stats@example.com',
      to: userData.email,
      subject: template.subject.replace('{{teams}}', teams),
      html: template.generateHtml(userData)
    });
  }
}

export const emailService = new EmailService(); 