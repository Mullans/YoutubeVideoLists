"use node";
import { internalAction, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { internal } from "./_generated/api";

export const sendInvitationEmail = internalAction({
  args: {
    invitationId: v.id("listInvitations"),
  },
  handler: async (ctx, args) => {
    // Get invitation details
    const invitation = await ctx.runQuery(internal.lists.getInvitationDetails, {
      invitationId: args.invitationId,
    });

    console.log("📋 Invitation details:", invitation);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    console.log("🚀 Starting sendInvitationEmail with invitationId:", args.invitationId);
    
    // Use your own Resend API key
    const apiKey = process.env.RESEND_API_KEY || process.env.CONVEX_RESEND_API_KEY;
    console.log("📧 API Key available:", !!apiKey);
    console.log("📧 Using custom API key:", !!process.env.RESEND_API_KEY);
    console.log("📧 API Key prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "NOT_FOUND");
    
    const resend = new Resend(apiKey!);
    
    // Use your actual domain for the share URL
    const shareUrl = `https://seaninashoe.com/shared/${invitation.list.shareToken}`;
    console.log("🔗 Share URL:", shareUrl);
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">You've been invited to a video list!</h1>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #495057; margin-top: 0;">${invitation.list.name}</h2>
          <p style="color: #6c757d; margin-bottom: 0;">
            ${invitation.inviterName} has invited you to collaborate on their video list.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${shareUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View List
          </a>
        </div>
        
        <div style="background-color: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">What you can do:</h3>
          <ul style="color: #6c757d; margin-bottom: 0;">
            ${invitation.permissions.canView ? '<li>View all videos in the list</li>' : ''}
            ${invitation.permissions.canAdd ? '<li>Add new videos to the list</li>' : ''}
            ${invitation.permissions.canRemove ? '<li>Edit and remove videos from the list</li>' : ''}
          </ul>
        </div>
        
        <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
          If you don't want to receive these invitations, you can ignore this email.
        </p>
      </div>
    `;

    const emailPayload = {
      from: "VideoList Curator <noreply@seaninashoe.com>",
      to: invitation.invitedEmail,
      subject: `You've been invited to "${invitation.list.name}" video list`,
      html: emailHtml,
    };
    
    console.log("📤 Email payload:", {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length
    });

    try {
      console.log("📨 Attempting to send email...");
      const { data, error } = await resend.emails.send(emailPayload);

      if (error) {
        console.error("❌ Failed to send invitation email:", error);
        throw new Error("Failed to send invitation email: " + JSON.stringify(error));
      }

      console.log("✅ Invitation email sent successfully:", data);
      return data;
    } catch (error) {
      console.error("💥 Error sending invitation email:", error);
      throw error;
    }
  },
});
