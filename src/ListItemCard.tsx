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
  const [editTags, setEditTags] = useState(item.tags?.join(", ") || "");
  const [editRating1, setEditRating1] = useState(item.ratings?.category1 || 0);
  const [editRating2, setEditRating2] = useState(item.ratings?.category2 || 0);
  const [editRating3, setEditRating3] = useState(item.ratings?.category3 || 0);
  const [editDescription, setEditDescription] = useState(item.description ?? "");

  const deleteListItemMutation = useMutation(api.listItems.removeListItem);
  const updateListItemMutation = useMutation(api.listItems.updateListItem);
  const toggleWatchedMutation = useMutation(api.listItems.toggleWatchedStatus);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const addedByUser = useQuery(api.users.getUserByUserId, item.addedById ? { userId: item.addedById } : "skip");

  const isListOwner = userPermissions.isOwner;
  const canEditItem = userPermissions.canRemove || (loggedInUser?._id === item.addedById);
  const isWatched = item.watched || false;

  const handleWatchedToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion
    try {
      const newStatus = await toggleWatchedMutation({ itemId: item._id });
      toast.success(newStatus ? "Marked as watched" : "Marked as unwatched");
    } catch (error) {
      toast.error("Failed to update watched status: " + (error as Error).message);
    }
  };

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
    if (!editTitle.trim()) {
      toast.error("Title is required.");
      return;
    }
    try {
      await updateListItemMutation({
        itemId: item._id,
        title: editTitle,
        description: editDescription,
      });
      toast.success(`"${editTitle}" updated.`);
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update item. " + (error as Error).message);
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-all duration-300 ${
      isWatched ? 'bg-green-50 border-green-200' : 'bg-white'
    }`}>
      <div
        className={`p-4 flex gap-4 items-start cursor-pointer transition-colors duration-200 ${
          isWatched 
            ? 'hover:bg-green-100' 
            : 'hover:bg-gray-50'
        }`}
        onClick={() => !isEditing && onToggleExpand(item._id)}
      >
        {item.thumbnailUrl && (
          <div className="relative">
            <img
              src={item.thumbnailUrl}
              alt={`Thumbnail for ${item.title}`}
              className={`w-32 h-20 object-cover rounded-md flex-shrink-0 transition-opacity duration-300 ${
                isWatched ? 'opacity-75' : 'opacity-100'
              }`}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            {isWatched && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-md">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
        {!item.thumbnailUrl && (
          <div className={`w-32 h-20 rounded-md flex items-center justify-center text-gray-500 text-sm flex-shrink-0 transition-colors duration-300 ${
            isWatched ? 'bg-green-100' : 'bg-gray-200'
          }`}>
            No Thumbnail
          </div>
        )}
        <div className="flex-grow">
          <h4 className={`text-lg font-semibold hover:underline transition-colors duration-200 ${
            isWatched ? 'text-green-700' : 'text-primary'
          }`}>
            <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              {item.title}
            </a>
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {item.channelName && `by ${item.channelName}`}
            {item.channelName && addedByUser && ', '}
            {addedByUser && `added by ${addedByUser.username ? `@${addedByUser.username}` : addedByUser.name ?? addedByUser.email ?? "Unknown User"}`}
          </p>

          {(
            <div className="text-sm text-gray-600 mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center">
                <span className="font-medium mr-1">Entertainment:</span>
                <StarRating rating={item.ratings?.category1 || 0} isInteractive={isListOwner} onRate={(newVal) => handleRatingChange("category1", newVal)} />
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-1">Educational:</span>
                <StarRating rating={item.ratings?.category2 || 0} isInteractive={isListOwner} onRate={(newVal) => handleRatingChange("category2", newVal)} />
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-1">Rewatchability:</span>
                <StarRating rating={item.ratings?.category3 || 0} isInteractive={isListOwner} onRate={(newVal) => handleRatingChange("category3", newVal)} />
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-1 flex gap-2">
            {item.viewCount !== null && item.viewCount !== undefined && <span>{typeof item.viewCount === 'number' ? formatCount(item.viewCount) : item.viewCount} views</span>}
            {item.likeCount !== null && item.likeCount !== undefined && <span>{formatCount(item.likeCount)} likes</span>}
          </div>
        </div>
        
        {/* Button Cluster */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          {/* Watched Toggle Button */}
          <button
            onClick={handleWatchedToggle}
            className={`px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isWatched
                ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500'
            }`}
            title={isWatched ? "Mark as unwatched" : "Mark as watched"}
          >
            <div className="flex items-center gap-1">
              {isWatched ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Watched</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Watch</span>
                </>
              )}
            </div>
          </button>
          
          {/* Edit and Delete Buttons */}
          {canEditItem && !isEditing && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsEditing(true); 
                  if (!isExpanded) onToggleExpand(item._id);
                }}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {(isExpanded || isEditing) && (
        <div className={`p-4 border-t transition-colors duration-300 ${
          isWatched ? 'border-green-200 bg-green-25' : 'border-gray-200 bg-gray-50'
        }`}>
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium">Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1 w-full p-1.5 border rounded-md text-sm" />
              </div>

              <div>
                <label className="text-xs font-medium">Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} className="mt-1 w-full p-1.5 border rounded-md text-sm" />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="submit" className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors">Save Changes</button>
                <button type="button" onClick={() => { setIsEditing(false); }} className="px-3 py-1.5 text-sm bg-gray-300 text-black rounded hover:bg-gray-400 transition-colors">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm"><strong className="font-medium">Video URL:</strong> <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.videoUrl}</a></p>
              {item.tags && item.tags.length > 0 && (
                <p className="text-sm mt-1"><strong className="font-medium">Tags:</strong> {item.tags.join(", ")}</p>
              )}
              <p className="text-sm mt-1"><strong className="font-medium">Added on:</strong> {new Date(item._creationTime).toLocaleDateString()}</p>

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
