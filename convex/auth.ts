import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    
    // Check if email is verified (only for non-anonymous users)
    if (user.email && !user.emailVerificationTime) {
      // User has email but hasn't verified it yet
      return {
        ...user,
        emailVerified: false,
      };
    }
    
    return {
      ...user,
      emailVerified: true,
    };
  },
});
