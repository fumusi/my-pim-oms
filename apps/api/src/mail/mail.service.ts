import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendConfirmationEmail(email: string): void {
    // stub — replace with real MailerService in Story 5
    this.logger.log(`[MAIL STUB] Confirmation email → ${email}`);
  }
}
