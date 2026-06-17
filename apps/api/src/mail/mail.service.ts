import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async sendConfirmationEmail(to: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const url = `${appUrl}/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to,
      subject: 'Welcome to PIM OMS – confirm your email',
      html: `
        <h2>Welcome to PIM OMS!</h2>
        <p>Click below to confirm your email address:</p>
        <p><a href="${url}">Confirm email</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const url = `${appUrl}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to,
      subject: 'Reset your password – PIM OMS',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
        <p><a href="${url}">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }
}
