import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendMail(
    to: string | string[],
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`,
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send email to ${Array.isArray(to) ? to.join(', ') : to}`,
        errorStack,
      );
      throw error;
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const subject = 'Verify your email address';
    const text = `Please verify your email by clicking the link: ${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const html = `
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a></p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    await this.sendMail(to, subject, text, html);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const subject = 'Reset your password';
    const text = `Reset your password by clicking the link: ${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    await this.sendMail(to, subject, text, html);
  }
}
