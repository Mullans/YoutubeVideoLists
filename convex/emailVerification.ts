import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const createVerificationToken = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a random token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Set expiration to 24 hours from now
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    
    // Check if verification already exists for this email
    const existing = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      // Update existing verification
      await ctx.db.patch(existing._id, {
        token,
        expiresAt,
        verified: false,
      });
    } else {
      // Create new verification
      await ctx.db.insert("emailVerifications", {
        email: args.email,
        token,
        expiresAt,
        verified: false,
      });
    }
    
    // Send verification email
    await ctx.scheduler.runAfter(0, internal.verificationEmails.sendVerificationEmail, {
      email: args.email,
      token,
    });
    
    return { success: true };
  },
});

export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!verification) {
      throw new Error("Invalid verification token");
    }
    
    if (verification.expiresAt < Date.now()) {
      throw new Error("Verification token has expired");
    }
    
    if (verification.verified) {
      throw new Error("Email already verified");
    }
    
    // Mark as verified
    await ctx.db.patch(verification._id, {
      verified: true,
    });
    
    // Update user's emailVerificationTime
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", verification.email))
      .first();
    
    if (user) {
      await ctx.db.patch(user._id, {
        emailVerificationTime: Date.now(),
      });
    }
    
    return { success: true, email: verification.email };
  },
});

export const isEmailVerified = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    return verification?.verified || false;
  },
});
