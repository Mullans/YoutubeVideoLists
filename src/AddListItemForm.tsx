import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface AddListItemFormProps {
  listId: Id<"lists">;
}

export function AddListItemForm({ listId }: AddListItemFormProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addListItemMutation = useMutation(api.listItems.addListItem);
  const getVideoMetadataAction = useAction(api.videoUtils.getVideoMetadata);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loggedInUser) {
      toast.error("You must be logged in to add items.");
      return;
    }
    if (!videoUrl.trim()) {
      toast.error("Video URL is required.");
      return;
    }

    try {
      new URL(videoUrl);
    } catch (_) {
      toast.error("Please enter a valid Video URL.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch video metadata
      const result = await getVideoMetadataAction({ videoUrl });
      
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (!result || !result.title) {
        toast.error("Could not fetch video metadata. Please check the URL and try again.");
        return;
      }

      const tagsArray = tags.split(",").map(tag => tag.trim()).filter(tag => tag);

      // Add the video to the list
      await addListItemMutation({
        listId,
        videoUrl,
        title: result.title,
        thumbnailUrl: result.thumbnailUrl || "",
        tags: tagsArray,
        ratingCategory1: 0,
        ratingCategory2: 0,
        ratingCategory3: 0,
        description: result.description === null ? undefined : result.description,
        viewCount: result.viewCount === null ? undefined : result.viewCount,
        likeCount: result.likeCount === null ? undefined : result.likeCount,
        authorName: result.authorName === null ? undefined : result.authorName,
      });

      toast.success(`"${result.title}" added to the list!`);
      setVideoUrl("");
      setTags("");
    } catch (error) {
      toast.error("Failed to add item. " + (error as Error).message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border p-4 rounded-md bg-gray-50">
      <h3 className="text-xl font-semibold mb-3 text-gray-700">Add New Video</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-600">Video URL*</label>
          <input
            id="videoUrl" 
            type="url" 
            value={videoUrl} 
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-600">Tags (comma-separated)</label>
          <input
            id="tags" 
            type="text" 
            value={tags} 
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., tutorial, javascript, react"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!videoUrl.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Adding Video...</span>
            </div>
          ) : (
            "Add Video to List"
          )}
        </button>
      </form>
    </div>
  );
}
