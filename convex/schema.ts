import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  lists: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    shareToken: v.string(),
    permissions: v.optional(v.object({
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
    })),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_shareToken", ["shareToken"]),

  listItems: defineTable({
    listId: v.id("lists"),
    videoUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    addedById: v.id("users"),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    channelName: v.optional(v.string()),
    viewCount: v.optional(v.union(v.string(), v.number())),
    publishedAt: v.optional(v.string()),
    // Legacy fields for migration
    tags: v.optional(v.array(v.string())),
    ratings: v.optional(v.object({
      category1: v.number(),
      category2: v.number(),
      category3: v.number(),
    })),
    likeCount: v.optional(v.number()),
    authorName: v.optional(v.string()),
  })
    .index("by_listId", ["listId"])
    .index("by_addedById", ["addedById"]),

  listInvitations: defineTable({
    listId: v.id("lists"),
    invitedEmail: v.string(),
    invitedById: v.id("users"),
    status: v.string(), // "pending", "accepted", "declined"
  })
    .index("by_listId", ["listId"])
    .index("by_invitedEmail", ["invitedEmail"]),

  emailVerifications: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    verified: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  // Add usernames table to track unique usernames
  usernames: defineTable({
    username: v.string(),
    userId: v.id("users"),
  })
    .index("by_username", ["username"])
    .index("by_userId", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
