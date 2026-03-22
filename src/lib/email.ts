import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || "noreply@example.com";

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<void> {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Verify your email",
    text: `Welcome to Pastebin Clone! Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can ignore this email.`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your password",
    text: `You requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can ignore this email.`,
  });
}
