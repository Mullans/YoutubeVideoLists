import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "./_generated/dataModel";

export const addListItem = mutation({
  args: {
    listId: v.id("lists"),
    videoUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    channelName: v.optional(v.string()),
    viewCount: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in to add an item.");
    }

    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found.");
    }

    // Check if user has permission to add items
    const hasPermission = await checkUserPermission(ctx, list, userId, "canAdd");
    if (!hasPermission) {
      throw new Error("User does not have permission to add items to this list.");
    }

    const listItemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      videoUrl: args.videoUrl,
      title: args.title,
      description: args.description,
      addedById: userId,
      thumbnailUrl: args.thumbnailUrl,
      duration: args.duration,
      channelName: args.channelName,
      viewCount: args.viewCount,
      publishedAt: args.publishedAt,
    });
    return listItemId;
  },
});

export const getListItems = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) {
      return [];
    }

    // Check if user has permission to view the list
    const hasPermission = await checkUserPermission(ctx, list, userId, "canView");
    if (!hasPermission) {
      throw new Error("User does not have access to this list's items.");
    }

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .order("desc") 
      .collect();
    return items;
  },
});

export const updateListItem = mutation({
  args: {
    itemId: v.id("listItems"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("List item not found.");
    }

    const list = await ctx.db.get(item.listId);
    if (!list) {
      throw new Error("List not found.");
    }

    // Check if user has permission to remove items OR is the item creator
    const hasPermission = await checkUserPermission(ctx, list, userId, "canRemove");
    const isItemCreator = item.addedById === userId;
    
    if (!hasPermission && !isItemCreator) {
      throw new Error("User does not have permission to update this item.");
    }

    const updatePayload: Partial<Doc<"listItems">> = {};
    
    if (args.title !== undefined) {
      updatePayload.title = args.title;
    }
    if (args.description !== undefined) {
      updatePayload.description = args.description;
    }

    if (Object.keys(updatePayload).length > 0) {
      await ctx.db.patch(args.itemId, updatePayload);
    }
    return true;
  },
});

export const removeListItem = mutation({
  args: { itemId: v.id("listItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be logged in.");
    }
    
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("List item not found.");
    }
    
    const list = await ctx.db.get(item.listId);
    if (!list) {
      throw new Error("List not found.");
    }

    // Check if user has permission to remove items OR is the item creator
    const hasPermission = await checkUserPermission(ctx, list, userId, "canRemove");
    const isItemCreator = item.addedById === userId;
    
    if (!hasPermission && !isItemCreator) {
      throw new Error("User does not have permission to delete this item.");
    }
    
    await ctx.db.delete(args.itemId);
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

// Helper function to check user permissions
async function checkUserPermission(ctx: any, list: any, userId: Id<"users"> | null, permission: "canView" | "canAdd" | "canRemove") {
  // Owner always has all permissions
  if (userId && list.ownerId === userId) {
    return true;
  }
  
  const permissions = list.permissions || getDefaultPermissions();
  
  // Check invited permissions first (highest priority)
  if (userId) {
    const user = await ctx.db.get(userId);
    if (user?.email) {
      const invitation = await ctx.db
        .query("listInvitations")
        .withIndex("by_listId", (q: any) => q.eq("listId", list._id))
        .filter((q: any) => q.eq(q.field("invitedEmail"), user.email))
        .first();
      
      if (invitation) {
        return permissions.invited[permission];
      }
    }
  }
  
  // Check user permissions (logged in users)
  if (userId && permissions.users[permission]) {
    return true;
  }
  
  // Check public permissions
  if (permissions.public[permission]) {
    return true;
  }
  
  return false;
}
