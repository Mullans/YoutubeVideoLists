"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    console.log("📧 API Key prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "NOT_FOUND");
    
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

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

    const emailPayload = {
      from: "noreply@seaninashoe.com",
      to: [args.email],
      subject: "Verify your email address - VideoList Curator",
      html: emailHtml,
    };

    try {
      console.log("📨 Attempting to send verification email via direct HTTP request...");
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      const responseText = await response.text();
      console.log("📨 Resend API response status:", response.status);
      console.log("📨 Resend API response:", responseText);

      if (!response.ok) {
        console.error("❌ Failed to send verification email:", responseText);
        throw new Error(`Failed to send verification email: ${response.status} ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log("✅ Verification email sent successfully:", data);
      return data;
    } catch (error) {
      console.error("💥 Error sending verification email:", error);
      throw error;
    }
  },
});
