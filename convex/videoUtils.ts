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

// Helper function to detect video platform
function detectPlatform(url: string): "youtube" | "vimeo" | "dailymotion" | "twitch" | "other" {
  try {
    const inputUrl = new URL(url);
    
    if (inputUrl.hostname.includes("youtube.com") || inputUrl.hostname.includes("youtu.be")) {
      return "youtube";
    }
    if (inputUrl.hostname.includes("vimeo.com")) {
      return "vimeo";
    }
    if (inputUrl.hostname.includes("dailymotion.com")) {
      return "dailymotion";
    }
    if (inputUrl.hostname.includes("twitch.tv")) {
      return "twitch";
    }
    
    return "other";
  } catch (error) {
    return "other";
  }
}

// Helper function to clean and normalize video URLs
function cleanVideoUrl(url: string): string {
  try {
    const inputUrl = new URL(url);
    
    // Handle YouTube URLs
    if (inputUrl.hostname.includes("youtube.com") || inputUrl.hostname.includes("youtu.be")) {
      let videoId: string | null = null;
      
      if (inputUrl.hostname === "youtu.be") {
        // youtu.be/VIDEO_ID format
        videoId = inputUrl.pathname.substring(1).split('/')[0];
      } else if (inputUrl.pathname.includes("/watch")) {
        // youtube.com/watch?v=VIDEO_ID format
        videoId = inputUrl.searchParams.get("v");
      } else if (inputUrl.pathname.includes("/embed/")) {
        // youtube.com/embed/VIDEO_ID format
        videoId = inputUrl.pathname.split("/embed/")[1].split('/')[0];
      } else if (inputUrl.pathname.includes("/shorts/")) {
        // youtube.com/shorts/VIDEO_ID format
        videoId = inputUrl.pathname.split("/shorts/")[1].split('/')[0];
      }
      
      if (videoId) {
        // Remove any additional parameters from video ID
        videoId = videoId.split('?')[0].split('&')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
    
    // Handle Vimeo URLs
    if (inputUrl.hostname.includes("vimeo.com")) {
      const pathParts = inputUrl.pathname.split('/').filter(part => part);
      if (pathParts.length > 0) {
        const videoId = pathParts[pathParts.length - 1].split('?')[0];
        return `https://vimeo.com/${videoId}`;
      }
    }
    
    // Handle Dailymotion URLs
    if (inputUrl.hostname.includes("dailymotion.com")) {
      if (inputUrl.pathname.includes("/video/")) {
        const videoId = inputUrl.pathname.split("/video/")[1].split('_')[0];
        return `https://www.dailymotion.com/video/${videoId}`;
      }
    }
    
    // Handle Twitch URLs (videos and clips)
    if (inputUrl.hostname.includes("twitch.tv")) {
      if (inputUrl.pathname.includes("/videos/")) {
        const videoId = inputUrl.pathname.split("/videos/")[1].split('?')[0];
        return `https://www.twitch.tv/videos/${videoId}`;
      } else if (inputUrl.pathname.includes("/clip/")) {
        const clipSlug = inputUrl.pathname.split("/clip/")[1].split('?')[0];
        return `https://www.twitch.tv/clip/${clipSlug}`;
      } else if (inputUrl.hostname.includes("clips.twitch.tv")) {
        // Handle clips.twitch.tv/SLUG format
        const clipSlug = inputUrl.pathname.substring(1).split('?')[0];
        return `https://www.twitch.tv/clip/${clipSlug}`;
      }
    }
    
    // For other URLs, remove common tracking parameters but keep the basic structure
    const cleanUrl = new URL(url);
    const paramsToRemove = [
      't', 'time_continue', 'feature', 'app', 'si', 'pp', 'fbclid', 'gclid', 
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'campaign', 'medium'
    ];
    
    paramsToRemove.forEach(param => {
      cleanUrl.searchParams.delete(param);
    });
    
    return cleanUrl.toString();
    
  } catch (error) {
    console.error("Error cleaning URL:", error);
    // If URL parsing fails, return the original URL
    return url;
  }
}

// Helper function to get Twitch OAuth token
async function getTwitchAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
    
    console.warn('Failed to get Twitch access token:', response.status, response.statusText);
    return null;
  } catch (error) {
    console.error('Error getting Twitch access token:', error);
    return null;
  }
}

// Helper function to fetch YouTube metadata
async function fetchYouTubeMetadata(videoId: string, apiKey?: string) {
  let title: string | null = null;
  let thumbnailUrl: string | null = null;
  let authorName: string | null = null;
  let description: string | null = null;
  let viewCount: number | null = null;
  let likeCount: number | null = null;

  if (apiKey && videoId) {
    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics`;
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
          viewCount = item.statistics?.viewCount ? parseInt(item.statistics.viewCount) : null;
          likeCount = item.statistics?.likeCount ? parseInt(item.statistics.likeCount) : null;
        }
      } else {
        console.warn(`YouTube Data API request failed: ${ytApiResponse.status} ${ytApiResponse.statusText}`);
      }
    } catch (e) {
      console.error("Error fetching from YouTube Data API:", e);
    }
  }

  return { title, thumbnailUrl, authorName, description, viewCount, likeCount };
}

// Helper function to fetch Vimeo metadata
async function fetchVimeoMetadata(videoId: string, apiKey?: string) {
  let title: string | null = null;
  let thumbnailUrl: string | null = null;
  let authorName: string | null = null;
  let description: string | null = null;
  let viewCount: number | null = null;

  if (apiKey) {
    try {
      const vimeoApiUrl = `https://api.vimeo.com/videos/${videoId}`;
      const response = await fetch(vimeoApiUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        title = data.name || null;
        thumbnailUrl = data.pictures?.sizes?.[data.pictures.sizes.length - 1]?.link || null;
        authorName = data.user?.name || null;
        description = data.description || null;
        viewCount = data.stats?.plays || null;
      } else {
        console.warn(`Vimeo API request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching from Vimeo API:", error);
    }
  }

  return { title, thumbnailUrl, authorName, description, viewCount };
}

// Helper function to fetch Dailymotion metadata
async function fetchDailymotionMetadata(videoId: string) {
  let title: string | null = null;
  let thumbnailUrl: string | null = null;
  let authorName: string | null = null;
  let description: string | null = null;
  let viewCount: number | null = null;

  try {
    const dailymotionApiUrl = `https://www.dailymotion.com/services/oembed?url=https://www.dailymotion.com/video/${videoId}&format=json`;
    const response = await fetch(dailymotionApiUrl);

    if (response.ok) {
      const data = await response.json();
      title = data.title || null;
      thumbnailUrl = data.thumbnail_url || null;
      authorName = data.author_name || null;
      // Dailymotion oEmbed doesn't provide description or view count
    } else {
      console.warn(`Dailymotion API request failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error fetching from Dailymotion API:", error);
  }

  return { title, thumbnailUrl, authorName, description, viewCount };
}

// Helper function to fetch Twitch video metadata
async function fetchTwitchVideoMetadata(videoId: string, clientId?: string, clientSecret?: string) {
  let title: string | null = null;
  let thumbnailUrl: string | null = null;
  let authorName: string | null = null;
  let description: string | null = null;
  let viewCount: number | null = null;

  if (clientId && clientSecret) {
    try {
      const accessToken = await getTwitchAccessToken(clientId, clientSecret);
      if (accessToken) {
        const twitchApiUrl = `https://api.twitch.tv/helix/videos?id=${videoId}`;
        const response = await fetch(twitchApiUrl, {
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const video = data.data[0];
            title = video.title || null;
            thumbnailUrl = video.thumbnail_url?.replace('%{width}', '480').replace('%{height}', '272') || null;
            authorName = video.user_name || null;
            description = video.description || null;
            viewCount = video.view_count || null;
          }
        } else {
          console.warn(`Twitch API request failed: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Error fetching from Twitch API:", error);
    }
  }

  return { title, thumbnailUrl, authorName, description, viewCount };
}

// Helper function to fetch Twitch clip metadata
async function fetchTwitchClipMetadata(clipSlug: string, clientId?: string, clientSecret?: string) {
  let title: string | null = null;
  let thumbnailUrl: string | null = null;
  let authorName: string | null = null;
  let description: string | null = null;
  let viewCount: number | null = null;

  if (clientId && clientSecret) {
    try {
      const accessToken = await getTwitchAccessToken(clientId, clientSecret);
      if (accessToken) {
        // First try to get clip by ID (slug)
        let twitchApiUrl = `https://api.twitch.tv/helix/clips?id=${clipSlug}`;
        let response = await fetch(twitchApiUrl, {
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const clip = data.data[0];
            title = clip.title || null;
            thumbnailUrl = clip.thumbnail_url || null;
            authorName = clip.broadcaster_name || null;
            // Clips don't have descriptions, but we can use the game name
            description = clip.game_name ? `Clip from ${clip.game_name}` : null;
            viewCount = clip.view_count || null;
          }
        } else {
          console.warn(`Twitch Clips API request failed: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Error fetching from Twitch Clips API:", error);
    }
  }

  return { title, thumbnailUrl, authorName, description, viewCount };
}

// Helper function to try oEmbed as fallback
async function tryOEmbedFallback(cleanedUrl: string, platform: string) {
  let title: string | null = null;
  let thumbnailUrl: string | null = null;
  let authorName: string | null = null;

  try {
    let oEmbedUrl: string;
    
    switch (platform) {
      case "youtube":
        oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanedUrl)}&format=json`;
        break;
      case "vimeo":
        oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(cleanedUrl)}`;
        break;
      case "dailymotion":
        oEmbedUrl = `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(cleanedUrl)}&format=json`;
        break;
      default:
        return { title, thumbnailUrl, authorName };
    }

    const oEmbedResponse = await fetch(oEmbedUrl);
    if (oEmbedResponse.ok) {
      const oEmbedData = await oEmbedResponse.json();
      title = oEmbedData.title || null;
      thumbnailUrl = oEmbedData.thumbnail_url || null;
      authorName = oEmbedData.author_name || null;
    } else {
      console.warn(`oEmbed request failed for ${platform}: ${oEmbedResponse.status} ${oEmbedResponse.statusText}`);
    }
  } catch (e) {
    console.error(`Error fetching from oEmbed for ${platform}:`, e);
  }

  return { title, thumbnailUrl, authorName };
}

export const getVideoMetadata = action({
  args: {
    videoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Get API keys from environment
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const VIMEO_API_KEY = process.env.VIMEO_API_KEY;
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    
    // Clean the input URL first
    const cleanedUrl = cleanVideoUrl(args.videoUrl);
    const platform = detectPlatform(cleanedUrl);
    
    console.log("Original URL:", args.videoUrl);
    console.log("Cleaned URL:", cleanedUrl);
    console.log("Detected platform:", platform);
    
    let inputUrl: URL;
    try {
      inputUrl = new URL(cleanedUrl);
    } catch (error) {
      console.error("Invalid video URL format:", cleanedUrl, error);
      return { error: "Invalid video URL format." };
    }

    let title: string | null = null;
    let thumbnailUrl: string | null = null;
    let authorName: string | null = null;
    let description: string | null = null;
    let viewCount: number | null = null;
    let likeCount: number | null = null;
    let viewCountFormatted: string | null = null;
    let likeCountFormatted: string | null = null;

    // Platform-specific metadata fetching
    switch (platform) {
      case "youtube": {
        let videoId: string | null = null;
        
        if (inputUrl.hostname === "youtu.be") {
          videoId = inputUrl.pathname.substring(1);
        } else if (inputUrl.searchParams.has("v")) {
          videoId = inputUrl.searchParams.get("v");
        }

        if (videoId) {
          const metadata = await fetchYouTubeMetadata(videoId, YOUTUBE_API_KEY);
          title = metadata.title;
          thumbnailUrl = metadata.thumbnailUrl;
          authorName = metadata.authorName;
          description = metadata.description;
          viewCount = metadata.viewCount;
          likeCount = metadata.likeCount;
        }
        break;
      }

      case "vimeo": {
        const pathParts = inputUrl.pathname.split('/').filter(part => part);
        if (pathParts.length > 0) {
          const videoId = pathParts[pathParts.length - 1];
          const metadata = await fetchVimeoMetadata(videoId, VIMEO_API_KEY);
          title = metadata.title;
          thumbnailUrl = metadata.thumbnailUrl;
          authorName = metadata.authorName;
          description = metadata.description;
          viewCount = metadata.viewCount;
        }
        break;
      }

      case "dailymotion": {
        if (inputUrl.pathname.includes("/video/")) {
          const videoId = inputUrl.pathname.split("/video/")[1].split('_')[0];
          const metadata = await fetchDailymotionMetadata(videoId);
          title = metadata.title;
          thumbnailUrl = metadata.thumbnailUrl;
          authorName = metadata.authorName;
          description = metadata.description;
          viewCount = metadata.viewCount;
        }
        break;
      }

      case "twitch": {
        if (inputUrl.pathname.includes("/videos/")) {
          // Handle Twitch videos
          const videoId = inputUrl.pathname.split("/videos/")[1];
          const metadata = await fetchTwitchVideoMetadata(videoId, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
          title = metadata.title;
          thumbnailUrl = metadata.thumbnailUrl;
          authorName = metadata.authorName;
          description = metadata.description;
          viewCount = metadata.viewCount;
        } else if (inputUrl.pathname.includes("/clip/")) {
          // Handle Twitch clips
          const clipSlug = inputUrl.pathname.split("/clip/")[1];
          const metadata = await fetchTwitchClipMetadata(clipSlug, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
          title = metadata.title;
          thumbnailUrl = metadata.thumbnailUrl;
          authorName = metadata.authorName;
          description = metadata.description;
          viewCount = metadata.viewCount;
        }
        break;
      }

      default:
        console.log("Unsupported platform:", platform);
        return { error: "Unsupported video platform." };
    }

    // Try oEmbed fallback if we're missing crucial data
    if (!title || !thumbnailUrl || !authorName) {
      console.log(`Missing data for ${platform}, trying oEmbed fallback...`);
      const fallbackData = await tryOEmbedFallback(cleanedUrl, platform);
      
      if (!title) title = fallbackData.title;
      if (!thumbnailUrl) thumbnailUrl = fallbackData.thumbnailUrl;
      if (!authorName) authorName = fallbackData.authorName;
    }

    // Format view and like counts
    if (viewCount !== null) viewCountFormatted = formatNumber(viewCount);
    if (likeCount !== null) likeCountFormatted = formatNumber(likeCount);

    // Check if we have enough data to proceed
    if (!title && !thumbnailUrl) {
      return { error: `Could not fetch video metadata from ${platform}.` };
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
      platform, // Include the detected platform
      originalUrl: args.videoUrl,
      cleanedUrl,
    };
  },
});
