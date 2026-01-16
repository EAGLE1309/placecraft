import { YouTubeVideo } from "@/types/learning";

/**
 * YouTube Data API v3 Integration for Learning System
 * Uses YOUTUBE_API_KEY environment variable
 * All results are cached in Firebase (in the chapter document)
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getYouTubeApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured. Please add it to your .env.local file.");
  }
  return apiKey;
}

interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSearchItem[];
}

interface YouTubeVideoDetailsItem {
  id: string;
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
  };
}

interface YouTubeVideoDetailsResponse {
  items: YouTubeVideoDetailsItem[];
}

/**
 * Search YouTube for educational videos on a topic
 * @param query - Search query (e.g., "React Hooks tutorial")
 * @param maxResults - Maximum number of results (default 5)
 * @returns Array of YouTubeVideo objects
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 5
): Promise<YouTubeVideo[]> {
  const apiKey = getYouTubeApiKey();
  
  // Build search query for educational content
  const searchQuery = `${query} tutorial programming`;
  
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: searchQuery,
    type: "video",
    maxResults: maxResults.toString(),
    order: "relevance",
    videoDuration: "medium", // Filter for medium length videos (4-20 minutes)
    videoEmbeddable: "true",
    safeSearch: "strict",
    relevanceLanguage: "en",
    key: apiKey,
  });

  try {
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?${searchParams.toString()}`
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error("[YouTube API] Search error:", errorData);
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData: YouTubeSearchResponse = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Get video IDs for fetching additional details
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");

    // Fetch video details (duration, view count)
    const detailsParams = new URLSearchParams({
      part: "contentDetails,statistics",
      id: videoIds,
      key: apiKey,
    });

    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?${detailsParams.toString()}`
    );

    let videoDetails: Map<string, { duration: string; viewCount: string }> = new Map();

    if (detailsResponse.ok) {
      const detailsData: YouTubeVideoDetailsResponse = await detailsResponse.json();
      detailsData.items.forEach((item) => {
        videoDetails.set(item.id, {
          duration: formatDuration(item.contentDetails.duration),
          viewCount: formatViewCount(item.statistics.viewCount),
        });
      });
    }

    // Map to our YouTubeVideo format
    const videos: YouTubeVideo[] = searchData.items.map((item) => {
      const details = videoDetails.get(item.id.videoId);
      return {
        videoId: item.id.videoId,
        title: decodeHtmlEntities(item.snippet.title),
        description: decodeHtmlEntities(item.snippet.description).substring(0, 200),
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: details?.duration,
        viewCount: details?.viewCount,
      };
    });

    return videos;
  } catch (error) {
    console.error("[YouTube API] Error searching videos:", error);
    throw error;
  }
}

/**
 * Generate fallback YouTube search URL for manual search
 * Used when API is unavailable or quota exceeded
 */
export function getYouTubeSearchUrl(query: string): string {
  const searchQuery = encodeURIComponent(`${query} tutorial programming`);
  return `https://www.youtube.com/results?search_query=${searchQuery}`;
}

/**
 * Format ISO 8601 duration to human readable format
 * e.g., "PT1H2M10S" -> "1:02:10"
 */
function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format view count to human readable format
 * e.g., "1234567" -> "1.2M views"
 */
function formatViewCount(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M views`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K views`;
  }
  return `${num} views`;
}

/**
 * Decode HTML entities in strings
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, (match) => entities[match] || match);
}

/**
 * Build a curated search query for a chapter
 */
export function buildVideoSearchQuery(
  subjectName: string,
  chapterTitle: string
): string {
  // Remove common words and create focused query
  const cleanSubject = subjectName.replace(/\s+/g, " ").trim();
  const cleanChapter = chapterTitle
    .replace(/^(Chapter \d+:?\s*)/i, "")
    .replace(/^(Introduction to|Getting Started with|Understanding)\s*/i, "")
    .trim();

  return `${cleanSubject} ${cleanChapter}`;
}
