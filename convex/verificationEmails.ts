"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY || process.env.CONVEX_RESEND_API_KEY;
    const resend = new Resend(apiKey!);
    
    const verificationUrl = `https://seaninashoe.com/verify-email?token=${args.token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">Verify Your Email Address</h1>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #495057; margin-bottom: 0;">
            Welcome to VideoList Curator! Please verify your email address to complete your account setup.
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #6c757d; font-size: 12px; text-align: center; margin-top: 30px;">
          This verification link will expire in 24 hours.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: "VideoList Curator <noreply@seaninashoe.com>",
      to: args.email,
      subject: "Verify your email address - VideoList Curator",
      html: emailHtml,
    });

    if (error) {
      throw new Error("Failed to send verification email: " + JSON.stringify(error));
    }

    return data;
  },
});
