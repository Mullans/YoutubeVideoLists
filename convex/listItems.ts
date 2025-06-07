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
    likeCount: v.optional(v.number()),
    platform: v.optional(v.union(v.literal("youtube"), v.literal("vimeo"), v.literal("dailymotion"), v.literal("twitch"), v.literal("other"))),
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
      likeCount: args.likeCount,
      platform: args.platform || "other",
      // Initialize default ratings
      ratings: {
        category1: 0,
        category2: 0,
        category3: 0,
      },
      // Remove global watched field - now handled per-user
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

    // If user is logged in, get their watched status for each item
    if (userId) {
      const userWatchedItems = await ctx.db
        .query("userWatchedItems")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
      
      const watchedItemsMap = new Map(
        userWatchedItems.map(item => [item.itemId, item.watched])
      );

      return items.map(item => ({
        ...item,
        watched: watchedItemsMap.get(item._id) || false,
      }));
    }

    // For anonymous users, all items are unwatched
    return items.map(item => ({
      ...item,
      watched: false,
    }));
  },
});

export const updateListItem = mutation({
  args: {
    itemId: v.id("listItems"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    ratingCategory1: v.optional(v.number()),
    ratingCategory2: v.optional(v.number()),
    ratingCategory3: v.optional(v.number()),
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
    
    // Handle rating updates
    if (args.ratingCategory1 !== undefined || args.ratingCategory2 !== undefined || args.ratingCategory3 !== undefined) {
      const currentRatings = item.ratings || { category1: 0, category2: 0, category3: 0 };
      updatePayload.ratings = {
        category1: args.ratingCategory1 !== undefined ? args.ratingCategory1 : currentRatings.category1,
        category2: args.ratingCategory2 !== undefined ? args.ratingCategory2 : currentRatings.category2,
        category3: args.ratingCategory3 !== undefined ? args.ratingCategory3 : currentRatings.category3,
      };
    }

    if (Object.keys(updatePayload).length > 0) {
      await ctx.db.patch(args.itemId, updatePayload);
    }
    return true;
  },
});

export const toggleWatchedStatus = mutation({
  args: {
    itemId: v.id("listItems"),
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

    // Check if user has permission to view the list (anyone who can view can mark as watched)
    const hasPermission = await checkUserPermission(ctx, list, userId, "canView");
    if (!hasPermission) {
      throw new Error("User does not have permission to update this item.");
    }

    // Check if user already has a watched status for this item
    const existingWatchedItem = await ctx.db
      .query("userWatchedItems")
      .withIndex("by_userId_and_itemId", (q) => 
        q.eq("userId", userId).eq("itemId", args.itemId)
      )
      .first();

    let newWatchedStatus: boolean;

    if (existingWatchedItem) {
      // Toggle existing status
      newWatchedStatus = !existingWatchedItem.watched;
      await ctx.db.patch(existingWatchedItem._id, { watched: newWatchedStatus });
    } else {
      // Create new watched status (default to true since user is marking as watched)
      newWatchedStatus = true;
      await ctx.db.insert("userWatchedItems", {
        userId,
        itemId: args.itemId,
        watched: newWatchedStatus,
      });
    }
    
    return newWatchedStatus;
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
    
    // Delete all user watched statuses for this item
    const userWatchedItems = await ctx.db
      .query("userWatchedItems")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .collect();
    
    for (const watchedItem of userWatchedItems) {
      await ctx.db.delete(watchedItem._id);
    }
    
    // Delete the item itself
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
