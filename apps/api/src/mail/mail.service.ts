import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendConfirmationEmail(email: string): Promise<void> {
    // stub — replace with real MailerService in Story 5
    this.logger.log(`[MAIL STUB] Confirmation email → ${email}`);
  }
}
