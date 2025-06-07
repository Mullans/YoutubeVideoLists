import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    
    // Get username
    const usernameRecord = await ctx.db
      .query("usernames")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    // Check if email is verified (only for non-anonymous users)
    if (user.email && !user.emailVerificationTime) {
      // User has email but hasn't verified it yet
      return {
        ...user,
        username: usernameRecord?.username || null,
        emailVerified: false,
      };
    }
    
    return {
      ...user,
      username: usernameRecord?.username || null,
      emailVerified: true,
    };
  },
});

export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existingUsername = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    return !existingUsername;
  },
});

export const createUsername = mutation({
  args: { 
    username: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if username is already taken
    const existingUsername = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    if (existingUsername) {
      throw new Error("Username is already taken");
    }

    // Check if user already has a username
    const existingUserUsername = await ctx.db
      .query("usernames")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existingUserUsername) {
      throw new Error("User already has a username");
    }

    // Create username record
    await ctx.db.insert("usernames", {
      username: args.username,
      userId: args.userId,
    });

    return true;
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const usernameRecord = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    if (!usernameRecord) {
      return null;
    }

    const user = await ctx.db.get(usernameRecord.userId);
    if (!user) {
      return null;
    }

    return {
      ...user,
      username: usernameRecord.username,
    };
  },
});

export const getUserByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const usernameRecord = await ctx.db
      .query("usernames")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return {
      ...user,
      username: usernameRecord?.username || null,
    };
  },
});

export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update name if provided
    if (args.name !== undefined) {
      await ctx.db.patch(userId, { name: args.name });
    }

    // Update username if provided
    if (args.username !== undefined && args.username !== null) {
      // Check if new username is available
      const existingUsername = await ctx.db
        .query("usernames")
        .withIndex("by_username", (q) => q.eq("username", args.username!))
        .first();
      
      if (existingUsername && existingUsername.userId !== userId) {
        throw new Error("Username is already taken");
      }

      // Get current username record
      const currentUsernameRecord = await ctx.db
        .query("usernames")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      if (currentUsernameRecord) {
        // Update existing username
        await ctx.db.patch(currentUsernameRecord._id, {
          username: args.username!,
        });
      } else {
        // Create new username record
        await ctx.db.insert("usernames", {
          username: args.username!,
          userId,
        });
      }
    }

    return true;
  },
});

export const createUsernameForCurrentUser = mutation({
  args: { 
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in");
    }

    // Check if username is already taken
    const existingUsername = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    if (existingUsername) {
      throw new Error("Username is already taken");
    }

    // Check if user already has a username
    const existingUserUsername = await ctx.db
      .query("usernames")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    if (existingUserUsername) {
      throw new Error("User already has a username");
    }

    // Create username record
    await ctx.db.insert("usernames", {
      username: args.username,
      userId,
    });

    return true;
  },
});
