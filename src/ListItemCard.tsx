import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
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

interface StarRatingProps {
  rating: number;
  isInteractive: boolean;
  onRate?: (newRating: number) => void;
}

const StarRating = ({ rating, isInteractive, onRate }: StarRatingProps) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex">
      {stars.map((starValue) => {
        let starClass = "text-gray-300";
        if (starValue <= Math.floor(rating)) {
          starClass = "text-yellow-400";
        } else if (starValue === Math.ceil(rating) && rating % 1 !== 0) {
          starClass = "text-yellow-400"; 
        }
        return (
          <span
            key={starValue}
            className={`${starClass} ${isInteractive ? 'cursor-pointer hover:text-yellow-500' : ''}`}
            onClick={(e) => {
              if (isInteractive && onRate) {
                e.stopPropagation(); // Prevent expansion when clicking stars
                onRate(starValue);
              }
            }}
            title={isInteractive ? `Rate ${starValue} stars` : `${rating} stars`}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

const formatCount = (num: number | undefined | null): string => {
  if (num === null || num === undefined) return "";
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

export function ListItemCard({ item, listOwnerId, userPermissions, isExpanded, onToggleExpand }: ListItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [editTitle, setEditTitle] = useState(item.title);
  const [editVideoUrl, setEditVideoUrl] = useState(item.videoUrl);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState(item.thumbnailUrl);
  const [editTags, setEditTags] = useState(item.tags.join(", "));
  const [editRating1, setEditRating1] = useState(item.ratings.category1);
  const [editRating2, setEditRating2] = useState(item.ratings.category2);
  const [editRating3, setEditRating3] = useState(item.ratings.category3);
  const [editDescription, setEditDescription] = useState(item.description ?? "");

  const deleteListItemMutation = useMutation(api.listItems.deleteListItem);
  const updateListItemMutation = useMutation(api.listItems.updateListItem);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const addedByUser = useQuery(api.users.getUserById, item.addedById ? { userId: item.addedById } : "skip");

  const isListOwner = userPermissions.isOwner;
  const canEditItem = userPermissions.canRemove || (loggedInUser?._id === item.addedById);

  const handleRatingChange = async (categoryKey: "category1" | "category2" | "category3", newRating: number) => {
    if (!isListOwner) return;
    
    const ratingKeyForMutation = `rating${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}` as 
      "ratingCategory1" | "ratingCategory2" | "ratingCategory3";

    try {
      await updateListItemMutation({
        itemId: item._id,
        [ratingKeyForMutation]: newRating,
      });
      toast.success(`Rating for ${categoryKey.replace('category', 'Category ')} updated to ${newRating}.`);
    } catch (error) {
      toast.error("Failed to update rating. " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await deleteListItemMutation({ itemId: item._id });
        toast.success(`"${item.title}" deleted.`);
      } catch (error) {
        toast.error("Failed to delete item. " + (error as Error).message);
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVideoUrl.trim() || !editTitle.trim()) {
      toast.error("Video URL and Title are required.");
      return;
    }
    try {
      new URL(editVideoUrl);
      if (editThumbnailUrl.trim()) new URL(editThumbnailUrl);
    } catch (_) {
      toast.error("Please enter valid URLs for Video and Thumbnail.");
      return;
    }
    const tagsArray = editTags.split(",").map(tag => tag.trim()).filter(tag => tag);
    try {
      await updateListItemMutation({
        itemId: item._id,
        title: editTitle,
        videoUrl: editVideoUrl,
        thumbnailUrl: editThumbnailUrl,
        tags: tagsArray,
        ratingCategory1: editRating1,
        ratingCategory2: editRating2,
        ratingCategory3: editRating3,
        description: editDescription,
      });
      toast.success(`"${editTitle}" updated.`);
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update item. " + (error as Error).message);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div
        className="p-4 flex gap-4 items-start cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => !isEditing && onToggleExpand(item._id)}
      >
        {item.thumbnailUrl && (
          <img
            src={item.thumbnailUrl}
            alt={`Thumbnail for ${item.title}`}
            className="w-32 h-20 object-cover rounded-md flex-shrink-0"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        {!item.thumbnailUrl && (
          <div className="w-32 h-20 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-sm flex-shrink-0">
            No Thumbnail
          </div>
        )}
        <div className="flex-grow">
          <h4 className="text-lg font-semibold text-primary hover:underline">
            <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              {item.title}
            </a>
          </h4>
          {item.authorName && <p className="text-xs text-gray-500">by {item.authorName}</p>}

          <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center">
              <span className="font-medium mr-1">Entertainment:</span>
              <StarRating rating={item.ratings.category1} isInteractive={isListOwner} onRate={(newVal) => handleRatingChange("category1", newVal)} />
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Educational:</span>
              <StarRating rating={item.ratings.category2} isInteractive={isListOwner} onRate={(newVal) => handleRatingChange("category2", newVal)} />
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Rewatchability:</span>
              <StarRating rating={item.ratings.category3} isInteractive={isListOwner} onRate={(newVal) => handleRatingChange("category3", newVal)} />
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-1 flex gap-2">
            {item.viewCount !== null && item.viewCount !== undefined && <span>{formatCount(item.viewCount)} views</span>}
            {item.likeCount !== null && item.likeCount !== undefined && <span>{formatCount(item.likeCount)} likes</span>}
          </div>
        </div>
        {canEditItem && !isEditing && (
          <div className="flex-shrink-0 space-x-2">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsEditing(true); 
                if (!isExpanded) onToggleExpand(item._id);
              }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {(isExpanded || isEditing) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium">Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1 w-full p-1.5 border rounded-md text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Video URL*</label>
                <input type="url" value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} className="mt-1 w-full p-1.5 border rounded-md text-sm" required/>
              </div>
              <div>
                <label className="text-xs font-medium">Thumbnail URL</label>
                <input type="url" value={editThumbnailUrl} onChange={e => setEditThumbnailUrl(e.target.value)} className="mt-1 w-full p-1.5 border rounded-md text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} className="mt-1 w-full p-1.5 border rounded-md text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Tags (comma-separated)</label>
                <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} className="mt-1 w-full p-1.5 border rounded-md text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs font-medium">Entertainment</label><input type="number" min="0" max="5" step="0.5" value={editRating1} onChange={e => setEditRating1(parseFloat(e.target.value))} className="mt-1 w-full p-1.5 border rounded-md text-sm" /></div>
                <div><label className="text-xs font-medium">Educational</label><input type="number" min="0" max="5" step="0.5" value={editRating2} onChange={e => setEditRating2(parseFloat(e.target.value))} className="mt-1 w-full p-1.5 border rounded-md text-sm" /></div>
                <div><label className="text-xs font-medium">Rewatchability</label><input type="number" min="0" max="5" step="0.5" value={editRating3} onChange={e => setEditRating3(parseFloat(e.target.value))} className="mt-1 w-full p-1.5 border rounded-md text-sm" /></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="submit" className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">Save Changes</button>
                <button type="button" onClick={() => { setIsEditing(false); }} className="px-3 py-1.5 text-sm bg-gray-300 text-black rounded hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm"><strong className="font-medium">Video URL:</strong> <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.videoUrl}</a></p>
              {item.tags.length > 0 && (
                <p className="text-sm mt-1"><strong className="font-medium">Tags:</strong> {item.tags.join(", ")}</p>
              )}
              <p className="text-sm mt-1"><strong className="font-medium">Added by:</strong> {addedByUser?.name ?? addedByUser?.email ?? "Unknown User"} on {new Date(item._creationTime).toLocaleDateString()}</p>

              {item.description && item.description.trim() !== "" ? (
                <div className="mt-2">
                  <strong className="font-medium text-sm">Description:</strong>
                  <p className="text-sm whitespace-pre-wrap bg-white p-2 border rounded-md max-h-40 overflow-y-auto">{item.description}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">No description available.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
