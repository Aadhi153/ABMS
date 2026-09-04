import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

/**
 * One SMTP server for the whole deployment (env-configured), not per-org DB
 * settings — matches the "self-hosted per client, own server" model, and a
 * per-org email-config UI wasn't part of the actual request.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly from = process.env.SMTP_FROM ?? "ABMS <no-reply@abms.local>";
  private readonly webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:5173";
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  async sendInvite(to: string, token: string, organizationName: string, role: string) {
    const link = `${this.webAppUrl}/invite/${token}`;
    await this.send(
      to,
      `You're invited to join ${organizationName} on ABMS`,
      `<p>You've been invited to join <strong>${organizationName}</strong> on ABMS as <strong>${role}</strong>.</p>
       <p><a href="${link}">Accept your invite and set a password</a></p>
       <p>This link expires in 7 days.</p>`,
    );
  }

  async sendPasswordReset(to: string, token: string) {
    const link = `${this.webAppUrl}/reset-password/${token}`;
    await this.send(
      to,
      "Reset your ABMS password",
      `<p>We received a request to reset your ABMS password.</p>
       <p><a href="${link}">Reset your password</a></p>
       <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    );
  }

  async sendQuoteToCustomer(to: string, quoteNumber: string, customerName: string, total: number, quoteId: string) {
    const link = `${this.webAppUrl}/sales/quotes/edit/${quoteId}`;
    await this.send(
      to,
      `Quote ${quoteNumber}`,
      `<p>Dear ${customerName},</p>
       <p>Please find your quote <strong>${quoteNumber}</strong> for <strong>₹${total.toFixed(2)}</strong>.</p>
       <p><a href="${link}">View the quote</a></p>`,
    );
  }

  async sendQuoteFollowup(to: string, quoteNumber: string, customerName: string, quoteId: string) {
    const link = `${this.webAppUrl}/sales/quotes/edit/${quoteId}`;
    await this.send(
      to,
      `Following up on Quote ${quoteNumber}`,
      `<p>Dear ${customerName},</p>
       <p>Just following up on quote <strong>${quoteNumber}</strong> we sent earlier. Let us know if you have any questions or would like to proceed.</p>
       <p><a href="${link}">View the quote</a></p>`,
    );
  }

  async sendNotificationEmail(to: string, title: string, message: string, link?: string) {
    const cta = link
      ? `<p><a href="${this.webAppUrl}${link}">View details</a></p>`
      : "";
    await this.send(
      to,
      title,
      `<p>${message}</p>
       ${cta}`,
    );
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
      throw err;
    }
  }
}
