import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendConfirmationEmail(email: string): Promise<void> {
    // stub — replace with real MailerService later
    this.logger.log(`[MAIL STUB] Confirmation email → ${email}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    // stub — replace with real MailerService later
    this.logger.log(`[MAIL STUB] Password reset email → ${to} | token: ${token}`);
  }
}
