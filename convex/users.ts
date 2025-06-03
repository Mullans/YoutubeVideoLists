import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    // Return only non-sensitive fields if needed, or the whole user doc
    // For this app, name and email are fine.
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
  },
});
