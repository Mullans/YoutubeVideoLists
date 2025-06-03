import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  emailVerifications: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    verified: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  lists: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    // Permission settings (optional for migration)
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
    // Share token for public/user access
    shareToken: v.optional(v.string()),
  }).index("by_ownerId", ["ownerId"])
    .index("by_shareToken", ["shareToken"]),

  listItems: defineTable({
    listId: v.id("lists"),
    videoUrl: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    tags: v.array(v.string()),
    ratings: v.object({
      category1: v.number(), // e.g., Entertainment
      category2: v.number(), // e.g., Educational
      category3: v.number(), // e.g., Rewatchability
    }),
    addedById: v.id("users"),
    // New fields for YouTube metadata
    description: v.optional(v.string()),
    viewCount: v.optional(v.number()),
    likeCount: v.optional(v.number()),
    authorName: v.optional(v.string()), // From oEmbed, can be kept
  })
    .index("by_listId", ["listId"])
    .index("by_addedById", ["addedById"]),

  // Invitations for specific users
  listInvitations: defineTable({
    listId: v.id("lists"),
    invitedEmail: v.string(),
    invitedById: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_listId", ["listId"])
    .index("by_invitedEmail", ["invitedEmail"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
