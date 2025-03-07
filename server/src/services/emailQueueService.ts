import { emailService } from './emailService';

interface QueuedEmail {
  id: string;
  type: 'dailyDigest' | 'achievement' | 'weeklyNewsletter' | 'gameAlert';
  userData: any;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  createdAt: Date;
}

class EmailQueueService {
  private queue: QueuedEmail[] = [];
  private isProcessing: boolean = false;
  private maxAttempts: number = 3;
  private processingInterval: number = 5000; // 5 seconds

  constructor() {
    this.startProcessing();
  }

  addToQueue(type: QueuedEmail['type'], userData: any): string {
    const id = Date.now().toString();
    this.queue.push({
      id,
      type,
      userData,
      attempts: 0,
      status: 'pending',
      createdAt: new Date()
    });
    return id;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const email = this.queue.find(e => e.status === 'pending');

    if (email) {
      email.status = 'processing';
      email.attempts += 1;
      email.lastAttempt = new Date();

      try {
        let success = false;

        switch (email.type) {
          case 'dailyDigest':
            success = await emailService.sendDailyDigest(email.userData);
            break;
          case 'achievement':
            success = await emailService.sendAchievementNotification(email.userData);
            break;
          case 'weeklyNewsletter':
            success = await emailService.sendWeeklyNewsletter(email.userData);
            break;
          case 'gameAlert':
            success = await emailService.sendGameAlert(email.userData);
            break;
        }

        if (success) {
          email.status = 'completed';
          this.removeFromQueue(email.id);
        } else {
          this.handleFailure(email);
        }
      } catch (error) {
        console.error('Error processing email:', error);
        this.handleFailure(email);
      }
    }

    this.isProcessing = false;
  }

  private handleFailure(email: QueuedEmail) {
    if (email.attempts >= this.maxAttempts) {
      email.status = 'failed';
      // Could implement notification system for failed emails
      console.error(`Email ${email.id} failed after ${this.maxAttempts} attempts`);
    } else {
      email.status = 'pending';
    }
  }

  private removeFromQueue(id: string) {
    this.queue = this.queue.filter(email => email.id !== id);
  }

  private startProcessing() {
    setInterval(() => {
      this.processQueue();
    }, this.processingInterval);
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(e => e.status === 'pending').length,
      processing: this.queue.filter(e => e.status === 'processing').length,
      failed: this.queue.filter(e => e.status === 'failed').length,
      completed: this.queue.filter(e => e.status === 'completed').length
    };
  }

  retryFailed() {
    this.queue
      .filter(email => email.status === 'failed')
      .forEach(email => {
        email.status = 'pending';
        email.attempts = 0;
      });
  }
}

export const emailQueueService = new EmailQueueService(); 