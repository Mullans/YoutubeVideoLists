import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";

interface ListItemCardProps {
  item: Doc<"listItems">;
  listOwnerId: Id<"users">;
  userPermissions: {
    canView: boolean;
    canAdd: boolean;
    canRemove: boolean;
    isOwner: boolean;
  };
  isExpanded: boolean;
  onToggleExpand: (itemId: string) => void;
}

export function ListItemCard({ item, listOwnerId, userPermissions, isExpanded, onToggleExpand }: ListItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description || "");
  
  const updateListItem = useMutation(api.listItems.updateListItem);
  const removeListItem = useMutation(api.listItems.removeListItem);
  const addedByUser = useQuery(api.users.getUserByUserId, { userId: item.addedById });

  const canEdit = userPermissions.isOwner || (userPermissions.canRemove && item.addedById === listOwnerId);

  const handleSaveEdit = async () => {
    try {
      await updateListItem({
        itemId: item._id,
        title: editTitle,
        description: editDescription,
      });
      setIsEditing(false);
      toast.success("Video updated successfully!");
    } catch (error) {
      toast.error("Failed to update video: " + (error as Error).message);
    }
  };

  const handleRemove = async () => {
    if (confirm("Are you sure you want to remove this video from the list?")) {
      try {
        await removeListItem({ itemId: item._id });
        toast.success("Video removed from list!");
      } catch (error) {
        toast.error("Failed to remove video: " + (error as Error).message);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-32 h-20 object-cover rounded cursor-pointer"
              onClick={() => onToggleExpand(item._id)}
            />
          ) : (
            <div 
              className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center cursor-pointer"
              onClick={() => onToggleExpand(item._id)}
            >
              <span className="text-gray-500 text-xs">No thumbnail</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded text-lg font-semibold"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                className="w-full px-3 py-2 border border-gray-300 rounded resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(item.title);
                    setEditDescription(item.description || "");
                  }}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h4 
                className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-primary line-clamp-2"
                onClick={() => onToggleExpand(item._id)}
              >
                {item.title}
              </h4>
              
              {item.description && (
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {item.channelName && (
                    <span>Channel: {item.channelName}</span>
                  )}
                  {item.duration && (
                    <span>Duration: {item.duration}</span>
                  )}
                  {item.viewCount && (
                    <span>Views: {item.viewCount}</span>
                  )}
                </div>
                
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleRemove}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>
                  Added by @{addedByUser?.username || addedByUser?.name || addedByUser?.email || "Unknown"}
                </span>
                <span>Added on {formatDate(item._creationTime)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && !isEditing && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex gap-4">
            <div className="flex-1">
              <h5 className="font-medium text-gray-700 mb-2">Video Details</h5>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>URL:</strong> <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{item.videoUrl}</a></p>
                {item.publishedAt && (
                  <p><strong>Published:</strong> {item.publishedAt}</p>
                )}
                {item.description && (
                  <div>
                    <strong>Description:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{item.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
