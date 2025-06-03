"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// Helper function to format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

export const getVideoMetadata = action({
  args: {
    videoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (YOUTUBE_API_KEY) {
      console.log("Using YouTube Data API Key for metadata fetching.");
    } else {
      console.log("YOUTUBE_API_KEY not set. Falling back to oEmbed for metadata fetching (limited data).");
    }
    let videoId: string | null = null;
    let inputUrl: URL;

    try {
      inputUrl = new URL(args.videoUrl);
      if (inputUrl.hostname === "youtu.be") {
        videoId = inputUrl.pathname.substring(1);
      } else if (inputUrl.searchParams.has("v")) {
        videoId = inputUrl.searchParams.get("v");
      }
    } catch (error) {
      console.error("Invalid video URL format:", args.videoUrl, error);
      return { error: "Invalid video URL format." };
    }

    if (!videoId && (inputUrl.hostname.includes("youtube.com") || inputUrl.hostname.includes("youtu.be"))) {
        // If it's a YouTube URL but we couldn't parse videoId (e.g. shorts, etc.)
        // We can try oEmbed first as it might handle more URL variations
    } else if (!videoId) {
        console.log("Not a recognized YouTube video URL or video ID not found.");
        return { error: "Not a YouTube video URL or video ID not found." };
    }
    
    const cleanYoutubeUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : args.videoUrl;

    let title: string | null = null;
    let thumbnailUrl: string | null = null;
    let authorName: string | null = null;
    let description: string | null = null;
    let viewCount: number | null = null;
    let likeCount: number | null = null;
    let viewCountFormatted: string | null = null;
    let likeCountFormatted: string | null = null;

    if (YOUTUBE_API_KEY && videoId) {
      const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,statistics`;
      try {
        const ytApiResponse = await fetch(youtubeApiUrl);
        if (ytApiResponse.ok) {
          const ytApiData = await ytApiResponse.json();
          if (ytApiData.items && ytApiData.items.length > 0) {
            const item = ytApiData.items[0];
            title = item.snippet?.title || null;
            thumbnailUrl = item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null;
            authorName = item.snippet?.channelTitle || null; 
            description = item.snippet?.description || null;
            console.log("Fetched description from YouTube API:", description ? description.substring(0,100) + "..." : "No description from API");
            viewCount = item.statistics?.viewCount ? parseInt(item.statistics.viewCount) : null;
            likeCount = item.statistics?.likeCount ? parseInt(item.statistics.likeCount) : null;
            
            if (viewCount !== null) viewCountFormatted = formatNumber(viewCount);
            if (likeCount !== null) likeCountFormatted = formatNumber(likeCount);
          }
        } else {
          console.warn(`YouTube Data API request failed: ${ytApiResponse.status} ${ytApiResponse.statusText}`);
          const errorBody = await ytApiResponse.text();
          console.warn("YT API Error body:", errorBody);
        }
      } catch (e) {
        console.error("Error fetching from YouTube Data API:", e);
      }
    }

    if (!title || !thumbnailUrl || !authorName || (YOUTUBE_API_KEY && videoId && !description)) { // Attempt oEmbed if crucial info (or desc with API key) is missing
        if (inputUrl.hostname.includes("youtube.com") || inputUrl.hostname.includes("youtu.be")) {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanYoutubeUrl)}&format=json`;
            try {
                const oEmbedResponse = await fetch(oEmbedUrl);
                if (oEmbedResponse.ok) {
                const oEmbedData = await oEmbedResponse.json();
                if (!title) title = oEmbedData.title || null;
                if (!thumbnailUrl) thumbnailUrl = oEmbedData.thumbnail_url || null;
                if (!authorName) authorName = oEmbedData.author_name || null;
                // oEmbed doesn't provide description, views, or likes.
                } else {
                    console.warn(`oEmbed request failed: ${oEmbedResponse.status} ${oEmbedResponse.statusText}`);
                }
            } catch (e) {
                console.error("Error fetching from oEmbed:", e);
            }
        } else if (!videoId) { // Only return error if it wasn't a youtube URL to begin with for oEmbed
             console.log("Unsupported video provider for oEmbed:", inputUrl.hostname);
             return { error: "Unsupported video provider." };
        }
    }
    
    if (!title && !thumbnailUrl && !videoId) { // If it's not a youtube video and we couldn't get metadata
        return { error: "Could not fetch video metadata for non-YouTube URL." };
    }
     if (!title && !thumbnailUrl && videoId) { // If it IS a youtube video but we still failed
        return { error: "Could not fetch YouTube video metadata." };
    }


    return {
      title,
      thumbnailUrl,
      authorName,
      description,
      viewCount,
      likeCount,
      viewCountFormatted,
      likeCountFormatted,
      originalUrl: args.videoUrl, // Keep track of the original URL for comparison
    };
  },
});
