import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendOtpParams {
  to: string;
  otp: string;
  purpose: 'verification' | 'password-reset' | 'sensitive-action';
  name?: string;
  expiryMinutes?: number;
}

interface SendWelcomeParams {
  to: string;
  name: string;
}

interface SendPasswordResetParams {
  to: string;
  name: string;
}

interface TemplatePayload {
  to: string;
  templateId: string;
  variables: Record<string, string | number>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly appName = 'RankRush';

  private readonly otpTemplateMap: Record<string, string> = {
    verification: 'rankrush-verification',
    'password-reset': 'rankrush-reset-password',
  };

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromEmail =
      this.config.get<string>('RESEND_FROM_EMAIL') ||
      'RankRush <support@rankrush.co.in>';
  }

  private async sendWithTemplate(payload: TemplatePayload): Promise<boolean> {
    const { to, templateId, variables } = payload;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        template: {
          id: templateId,
          variables,
        },
      });

      if (error) {
        this.logger.error(
          `Failed to send template email [${templateId}] to ${to}`,
          error,
        );
        return false;
      }

      this.logger.log(`Template email [${templateId}] sent to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(
        `Error sending template email [${templateId}] to ${to}`,
        err,
      );
      return false;
    }
  }

  async sendOtp(params: SendOtpParams): Promise<boolean> {
    const { to, otp, purpose, name, expiryMinutes = 10 } = params;
    const fullName = name || 'there';
    const templateId = this.otpTemplateMap[purpose];

    if (templateId) {
      return this.sendWithTemplate({
        to,
        templateId,
        variables: {
          FULL_NAME: fullName,
          OTP_CODE: otp,
          EXP_TIME: `${expiryMinutes} minutes`,
        },
      });
    }

    return this.sendSensitiveActionOtp(to, otp, fullName, expiryMinutes);
  }

  private async sendSensitiveActionOtp(
    to: string,
    otp: string,
    name: string,
    expiryMinutes: number,
  ): Promise<boolean> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `${this.appName} — Confirm your action`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #111827; font-size: 24px; margin: 0;">Confirm Your Action</h1>
            </div>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">A sensitive action was initiated on your account. Use this code to confirm:</p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #d97706; font-family: monospace;">${otp}</div>
            </div>
            <p style="color: #6b7280; font-size: 14px; text-align: center;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't initiate this, please change your password immediately.</p>
          </div>`,
      });

      if (error) {
        this.logger.error(
          `Failed to send sensitive-action OTP to ${to}`,
          error,
        );
        return false;
      }

      this.logger.log(`Sensitive-action OTP sent to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Error sending sensitive-action OTP to ${to}`, err);
      return false;
    }
  }

  async sendWelcome(params: SendWelcomeParams): Promise<boolean> {
    const { to, name } = params;

    return this.sendWithTemplate({
      to,
      templateId: 'welcome-email',
      variables: {
        FULL_NAME: name,
      },
    });
  }

  async sendPasswordResetConfirmation(
    params: SendPasswordResetParams,
  ): Promise<boolean> {
    const { to, name } = params;

    return this.sendWithTemplate({
      to,
      templateId: 'password-reset-confirmation',
      variables: {
        FULL_NAME: name,
      },
    });
  }
}
