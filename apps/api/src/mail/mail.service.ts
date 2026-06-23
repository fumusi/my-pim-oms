import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import type { Product } from '../products/entities/product.entity';
import type { LocalizedText } from '../common/types/localized-text.interface';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async sendConfirmationEmail(to: string, token: string): Promise<void> {
    const appUrl = this.config.getOrThrow<string>('APP_URL');
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

  async sendLowStockAlert(to: string[], products: Product[]): Promise<void> {
    const rows = products
      .map((p) => {
        const name = this.pickName(p.name);
        return `<tr><td>${name}</td><td>${p.barcode ?? '—'}</td><td>${p.stock ?? 0}</td><td>${p.lowStockThreshold ?? '—'}</td></tr>`;
      })
      .join('');

    await this.mailerService.sendMail({
      to,
      subject: `⚠️ Low stock alert — ${products.length} product(s) below threshold`,
      html: `
        <h2>Low Stock Alert</h2>
        <p>${products.length} product(s) are below their stock threshold:</p>
        <table border="1" cellpadding="6" cellspacing="0">
          <thead><tr><th>Name</th><th>SKU/Barcode</th><th>Current Stock</th><th>Threshold</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });
  }

  async sendOutOfStockAlert(to: string[], products: Product[]): Promise<void> {
    const rows = products
      .map((p) => {
        const name = this.pickName(p.name);
        return `<tr><td>${name}</td><td>${p.barcode ?? '—'}</td><td>${p.stock ?? 0}</td></tr>`;
      })
      .join('');

    await this.mailerService.sendMail({
      to,
      subject: `🚫 Out of stock alert — ${products.length} product(s) at zero`,
      html: `
        <h2>Out of Stock Alert</h2>
        <p>${products.length} product(s) are out of stock:</p>
        <table border="1" cellpadding="6" cellspacing="0">
          <thead><tr><th>Name</th><th>SKU/Barcode</th><th>Current Stock</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });
  }

  private pickName(text: LocalizedText | null | undefined): string {
    if (!text) return '—';
    return text.en ?? text.nl ?? text.de ?? '—';
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const appUrl = this.config.getOrThrow<string>('APP_URL');
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
