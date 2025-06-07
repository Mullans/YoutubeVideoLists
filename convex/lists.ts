import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Helper function to check if user is verified
async function isUserVerified(ctx: any, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    return false;
  }
  
  // Anonymous users are considered "verified" for basic functionality
  if (user.isAnonymous) {
    return true;
  }
  
  // Users without email are considered verified
  if (!user.email) {
    return true;
  }
  
  // Check if email is verified
  if (user.emailVerificationTime) {
    return true;
  }
  
  // Check the emailVerifications table
  const verification = await ctx.db
    .query("emailVerifications")
    .withIndex("by_email", (q: any) => q.eq("email", user.email!))
    .first();
  
  return verification?.verified || false;
}

export const createList = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in to create a list.");
    }
    
    // Generate a unique share token
    const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const listId = await ctx.db.insert("lists", {
      name: args.name,
      ownerId: userId,
      shareToken,
      permissions: {
        public: {
          canView: false,
          canAdd: false,
          canRemove: false,
        },
        users: {
          canView: false,
          canAdd: false,
          canRemove: false,
        },
        invited: {
          canView: true,
          canAdd: true,
          canRemove: false,
        },
      },
    });
    return listId;
  },
});

export const getMyLists = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
    return lists;
  },
});

export const getSharedLists = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user?.email) {
      return [];
    }

    // Get lists where user has been invited
    const invitations = await ctx.db
      .query("listInvitations")
      .withIndex("by_invitedEmail", (q) => q.eq("invitedEmail", user.email!))
      .collect();

    const sharedLists = [];
    
    for (const invitation of invitations) {
      const list = await ctx.db.get(invitation.listId);
      if (list && list.ownerId !== userId) {
        // Check if user has access based on permissions
        const hasAccess = await checkListAccess(ctx, list, userId);
        if (hasAccess) {
          const permissions = await getUserPermissionsForList(ctx, list, userId);
          sharedLists.push({
            ...list,
            accessLevel: "Invited",
            permissions,
          });
        }
      }
    }

    // Also get lists where user has general access (users permissions)
    const allLists = await ctx.db.query("lists").collect();
    for (const list of allLists) {
      if (list.ownerId !== userId) {
        const permissions = list.permissions || getDefaultPermissions();
        if (permissions.users.canView) {
          // Check if not already in shared lists from invitations
          const alreadyIncluded = sharedLists.some(sl => sl._id === list._id);
          if (!alreadyIncluded) {
            const userPermissions = await getUserPermissionsForList(ctx, list, userId);
            sharedLists.push({
              ...list,
              accessLevel: "Users",
              permissions: userPermissions,
            });
          }
        }
      }
    }

    return sharedLists;
  },
});

export const getListInvitations = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.ownerId !== userId) {
      throw new Error("User is not the owner of this list.");
    }

    const invitations = await ctx.db
      .query("listInvitations")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    // Check if invited users have accessed the list
    const invitationsWithStatus = await Promise.all(
      invitations.map(async (invitation) => {
        // Check if user exists and has accessed the list
        const invitedUser = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", invitation.invitedEmail))
          .first();

        let hasAccessed = false;
        if (invitedUser) {
          // Check if user has viewed any items from this list (indicating they've accessed it)
          const listItems = await ctx.db
            .query("listItems")
            .withIndex("by_listId", (q) => q.eq("listId", args.listId))
            .first();
          
          if (listItems) {
            // For simplicity, we'll consider them as having accessed if they exist as a user
            // In a more sophisticated system, you might track actual list views
            hasAccessed = true;
          }
        }

        return {
          ...invitation,
          hasAccessed,
          invitedUserExists: !!invitedUser,
        };
      })
    );

    return invitationsWithStatus;
  },
});

export const removeInvitation = mutation({
  args: {
    invitationId: v.id("listInvitations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }

    // Check if user is verified
    const verified = await isUserVerified(ctx, userId);
    if (!verified) {
      throw new Error("Email verification required to manage invitations.");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    const list = await ctx.db.get(invitation.listId);
    if (!list || list.ownerId !== userId) {
      throw new Error("User is not the owner of this list.");
    }

    await ctx.db.delete(args.invitationId);
    return true;
  },
});

export const resendInvitation = mutation({
  args: {
    invitationId: v.id("listInvitations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }

    // Check if user is verified
    const verified = await isUserVerified(ctx, userId);
    if (!verified) {
      throw new Error("Email verification required to resend invitations.");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    const list = await ctx.db.get(invitation.listId);
    if (!list || list.ownerId !== userId) {
      throw new Error("User is not the owner of this list.");
    }

    // Update the invitation timestamp to mark it as resent
    await ctx.db.patch(args.invitationId, {
      status: "pending",
    });

    // Send invitation email
    await ctx.scheduler.runAfter(0, internal.emails.sendInvitationEmail, {
      invitationId: args.invitationId,
    });
    
    return true;
  },
});

export const getList = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found.");
    }
    
    // Check if user has access
    const hasAccess = await checkListAccess(ctx, list, userId);
    if (!hasAccess) {
      throw new Error("User does not have access to this list.");
    }
    
    return list;
  },
});

export const getListByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const list = await ctx.db
      .query("lists")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .unique();
    
    if (!list) {
      throw new Error("List not found.");
    }
    
    // Check if user has access via share token
    const hasAccess = await checkListAccess(ctx, list, userId);
    if (!hasAccess) {
      throw new Error("User does not have access to this list.");
    }
    
    return list;
  },
});

export const updateListPermissions = mutation({
  args: {
    listId: v.id("lists"),
    permissions: v.object({
      public: v.object({
        canView: v.boolean(),
        canAdd: v.boolean(),
        canRemove: v.boolean(),
      }),
      users: v.object({
        canView: v.boolean(),
        canAdd: v.boolean(),
        canRemove: v.boolean(),
      }),
      invited: v.object({
        canView: v.boolean(),
        canAdd: v.boolean(),
        canRemove: v.boolean(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }
    
    const list = await ctx.db.get(args.listId);
    if (!list || list.ownerId !== userId) {
      throw new Error("User is not the owner of this list.");
    }
    
    await ctx.db.patch(args.listId, {
      permissions: args.permissions,
    });
    
    return true;
  },
});

export const inviteUserToList = mutation({
  args: {
    listId: v.id("lists"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }
    
    // Check if user is verified
    const verified = await isUserVerified(ctx, userId);
    if (!verified) {
      throw new Error("Email verification required to invite users.");
    }
    
    const list = await ctx.db.get(args.listId);
    if (!list || list.ownerId !== userId) {
      throw new Error("User is not the owner of this list.");
    }
    
    // Check if invitation already exists
    const existingInvitation = await ctx.db
      .query("listInvitations")
      .withIndex("by_listId", (q: any) => q.eq("listId", args.listId))
      .filter((q: any) => q.eq(q.field("invitedEmail"), args.email))
      .first();
    
    if (existingInvitation) {
      throw new Error("User is already invited to this list.");
    }
    
    const invitationId = await ctx.db.insert("listInvitations", {
      listId: args.listId,
      invitedEmail: args.email,
      invitedById: userId,
      status: "pending",
    });

    // Send invitation email
    await ctx.scheduler.runAfter(0, internal.emails.sendInvitationEmail, {
      invitationId,
    });
    
    return true;
  },
});

export const deleteList = mutation({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found.");
    }
    if (list.ownerId !== userId) {
      throw new Error("User is not the owner of this list.");
    }

    // Delete all items in the list first
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete all invitations
    const invitations = await ctx.db
      .query("listInvitations")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    await ctx.db.delete(args.listId);
    return true;
  },
});

// Helper function to get default permissions for migration
function getDefaultPermissions() {
  return {
    public: { canView: false, canAdd: false, canRemove: false },
    users: { canView: false, canAdd: false, canRemove: false },
    invited: { canView: true, canAdd: true, canRemove: false },
  };
}

// Helper function to check list access
async function checkListAccess(ctx: any, list: any, userId: Id<"users"> | null) {
  // Owner always has access
  if (userId && list.ownerId === userId) {
    return true;
  }
  
  const permissions = list.permissions || getDefaultPermissions();
  
  // Check public permissions
  if (permissions.public.canView) {
    return true;
  }
  
  // Check user permissions (must be logged in)
  if (userId && permissions.users.canView) {
    return true;
  }
  
  // Check invited permissions
  if (userId && permissions.invited.canView) {
    const user = await ctx.db.get(userId);
    if (user?.email) {
      const invitation = await ctx.db
        .query("listInvitations")
        .withIndex("by_listId", (q: any) => q.eq("listId", list._id))
        .filter((q: any) => q.eq(q.field("invitedEmail"), user.email))
        .first();
      
      if (invitation) {
        return true;
      }
    }
  }
  
  return false;
}

// Helper function to get user permissions for a list
async function getUserPermissionsForList(ctx: any, list: any, userId: Id<"users"> | null) {
  if (!userId) {
    const permissions = list.permissions || getDefaultPermissions();
    return {
      canView: permissions.public.canView,
      canAdd: permissions.public.canAdd,
      canRemove: permissions.public.canRemove,
      isOwner: false,
    };
  }

  // Owner has all permissions
  if (list.ownerId === userId) {
    return {
      canView: true,
      canAdd: true,
      canRemove: true,
      isOwner: true,
    };
  }

  const listPermissions = list.permissions || getDefaultPermissions();
  
  // Check invited permissions first (highest priority)
  const user = await ctx.db.get(userId);
  if (user?.email) {
    const invitation = await ctx.db
      .query("listInvitations")
      .withIndex("by_listId", (q: any) => q.eq("listId", list._id))
      .filter((q: any) => q.eq(q.field("invitedEmail"), user.email))
      .first();
    
    if (invitation) {
      // Check if user is verified for invited permissions that allow editing
      const verified = await isUserVerified(ctx, userId);
      return {
        canView: listPermissions.invited.canView,
        canAdd: verified ? listPermissions.invited.canAdd : false,
        canRemove: verified ? listPermissions.invited.canRemove : false,
        isOwner: false,
      };
    }
  }
  
  // Check user permissions (logged in users)
  return {
    canView: listPermissions.users.canView,
    canAdd: listPermissions.users.canAdd,
    canRemove: listPermissions.users.canRemove,
    isOwner: false,
  };
}

// Helper function to get user permissions for a list
export const getUserListPermissions = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const list = await ctx.db.get(args.listId);
    
    if (!list) {
      return null;
    }
    
    return await getUserPermissionsForList(ctx, list, userId);
  },
});

export const getInvitationDetails = internalQuery({
  args: {
    invitationId: v.id("listInvitations"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      return null;
    }

    const list = await ctx.db.get(invitation.listId);
    if (!list) {
      return null;
    }

    const inviter = await ctx.db.get(invitation.invitedById);
    if (!inviter) {
      return null;
    }

    const permissions = list.permissions || getDefaultPermissions();

    return {
      invitedEmail: invitation.invitedEmail,
      inviterName: inviter.name || inviter.email || "Someone",
      list: {
        name: list.name,
        shareToken: list.shareToken,
      },
      permissions: permissions.invited,
    };
  },
});
