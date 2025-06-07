import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState, FormEvent, useEffect } from "react";
import { toast } from "sonner";
import { AddListItemForm } from "./AddListItemForm";
import { ListItemCard } from "./ListItemCard";
import { ListSettingsModal } from "./ListSettingsModal";

interface ListViewProps {
  listId: Id<"lists">;
  onBack: () => void;
}

export function ListView({ listId, onBack }: ListViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const list = useQuery(api.lists.getList, { listId });
  const listItems = useQuery(api.listItems.getListItems, { listId });
  const userPermissions = useQuery(api.lists.getUserListPermissions, { listId });
  const listOwner = useQuery(api.users.getUserByUserId, list ? { userId: list.ownerId } : "skip");

  // Update page title when list loads
  useEffect(() => {
    if (list) {
      document.title = `${list.name} - VideoList Curator`;
    }
  }, [list]);

  if (list === undefined || listItems === undefined || userPermissions === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading list details...</p>
      </div>
    );
  }

  if (list === null || !userPermissions || !userPermissions.canView) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          &larr; Back to Lists
        </button>
        <p className="text-red-500">You have tried to access an invalid list. Please ensure that the list exists and you have permission to view it.</p>
      </div>
    );
  }

  const copyShareUrl = () => {
    // Check if the list has appropriate permissions for sharing
    const permissions = list.permissions || {
      public: { canView: false, canAdd: false, canRemove: false },
      users: { canView: false, canAdd: false, canRemove: false },
      invited: { canView: true, canAdd: true, canRemove: false },
    };

    const hasViewAccess = permissions.public.canView || permissions.users.canView || permissions.invited.canView;
    
    if (!hasViewAccess) {
      toast.error("Please update your list permissions to allow viewing before sharing. Go to Settings to configure access.");
      return;
    }

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/shared/${list.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const handleToggleExpand = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <div>
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          &larr; Back to Lists
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-primary">{list.name}</h2>
            {listOwner && (
              <p className="text-sm text-gray-600 mt-1">
                Created by @{listOwner.username || listOwner.name || listOwner.email || "Unknown"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyShareUrl}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              title="Copy shareable link for others"
            >
              Share
            </button>
            {userPermissions.isOwner && (
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {userPermissions.canAdd && <AddListItemForm listId={listId} />}

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-gray-700">Videos in this List</h3>
        {listItems.length === 0 ? (
          <p className="text-gray-500">
            No videos added to this list yet. 
            {userPermissions.canAdd ? " Use the form above to add one!" : ""}
          </p>
        ) : (
          <div className="space-y-4">
            {listItems.map((item) => (
              <ListItemCard 
                key={item._id} 
                item={item} 
                listOwnerId={list.ownerId}
                userPermissions={userPermissions}
                isExpanded={expandedItemId === item._id}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        )}
      </div>

      {userPermissions.isOwner && (
        <ListSettingsModal
          list={list}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
