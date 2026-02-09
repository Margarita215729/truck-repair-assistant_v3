/**
 * YouTube Search Service for Truck Diagnostic System
 * Searches for truck repair tutorial videos via YouTube Data API v3
 * Ported from v2 YouTubeSearchService.ts — TypeScript types removed
 */

/**
 * @typedef {Object} YouTubeVideo
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} thumbnail
 * @property {string} channelTitle
 * @property {string} publishedAt
 * @property {string} duration
 * @property {string} viewCount
 * @property {string} url
 */

/**
 * @typedef {Object} YouTubeSearchResult
 * @property {YouTubeVideo[]} videos
 * @property {number} totalResults
 * @property {string} searchQuery
 */

export class YouTubeSearchService {
  constructor(apiKey) {
    this.BASE_URL = 'https://www.googleapis.com/youtube/v3';
    // Uses the same Google API key as Google Maps (YouTube Data API v3 must be enabled)
    this.API_KEY = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Search for truck repair tutorial videos
   * @param {string[]} searchTerms
   * @param {number} [maxResults=5]
   * @returns {Promise<YouTubeSearchResult>}
   */
  async searchTruckRepairVideos(searchTerms, maxResults = 5) {
    if (!this.API_KEY) {
      console.warn('YouTube API key not provided, returning mock data');
      return this.getMockVideos(searchTerms);
    }

    try {
      const query = this.buildSearchQuery(searchTerms);
      const url = `${this.BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${this.API_KEY}&order=relevance&videoDuration=medium&videoDefinition=high`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return {
          videos: [],
          totalResults: 0,
          searchQuery: query
        };
      }

      // Get video details for duration and view count
      const videoIds = data.items.map((item) => item.id.videoId).join(',');
      const detailsUrl = `${this.BASE_URL}/videos?part=contentDetails,statistics&id=${videoIds}&key=${this.API_KEY}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      const videos = data.items.map((item, index) => {
        const details = detailsData.items[index];
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          duration: this.formatDuration(details?.contentDetails?.duration || 'PT0S'),
          viewCount: this.formatViewCount(details?.statistics?.viewCount || '0'),
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`
        };
      });

      return {
        videos,
        totalResults: data.pageInfo?.totalResults || videos.length,
        searchQuery: query
      };

    } catch (error) {
      console.error('YouTube search failed:', error);
      return this.getMockVideos(searchTerms);
    }
  }

  /**
   * Build optimized search query for truck repair videos
   * @param {string[]} searchTerms
   * @returns {string}
   */
  buildSearchQuery(searchTerms) {
    const baseTerms = searchTerms.map(term => term.toLowerCase());

    // Prioritize quick fix and emergency keywords
    const quickFixKeywords = [
      'quick fix',
      'roadside repair',
      'emergency repair',
      'truck hack',
      'roadside fix',
      'emergency solution',
      'temporary fix',
      'get moving'
    ];

    // Add truck-specific keywords
    const truckKeywords = [
      'truck repair',
      'heavy duty',
      'semi truck',
      'commercial vehicle',
      'diesel engine',
      'tutorial',
      'how to fix',
      'step by step'
    ];

    // Prioritize quick fix terms, then add truck keywords
    const allTerms = [...quickFixKeywords, ...baseTerms, ...truckKeywords];

    // Remove duplicates and limit to avoid query length issues
    const uniqueTerms = [...new Set(allTerms)].slice(0, 10);

    return uniqueTerms.join(' ');
  }

  /**
   * Format YouTube duration (PT4M13S -> 4:13)
   * @param {string} duration
   * @returns {string}
   */
  formatDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format view count (1234567 -> 1.2M)
   * @param {string} count
   * @returns {string}
   */
  formatViewCount(count) {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  /**
   * Get mock videos when API is not available
   * @param {string[]} searchTerms
   * @returns {YouTubeSearchResult}
   */
  getMockVideos(searchTerms) {
    const mockVideos = [
      {
        id: 'mock1',
        title: `${searchTerms[0] || 'Truck'} Quick Fix - Roadside Emergency Repair`,
        description: 'Emergency roadside repair techniques to get your truck moving quickly. Professional truck hack for immediate solution.',
        thumbnail: 'https://img.youtube.com/vi/mock1/mqdefault.jpg',
        channelTitle: 'Roadside Truck Hacks',
        publishedAt: '2024-01-15T10:00:00Z',
        duration: '4:30',
        viewCount: '125K',
        url: 'https://www.youtube.com/watch?v=mock1'
      },
      {
        id: 'mock2',
        title: `Emergency ${searchTerms[0] || 'Engine'} Fix - Get Moving in 5 Minutes`,
        description: 'Quick emergency fix for truck drivers stuck on the road. Professional trick to get your truck running again.',
        thumbnail: 'https://img.youtube.com/vi/mock2/mqdefault.jpg',
        channelTitle: 'Truck Emergency Solutions',
        publishedAt: '2024-01-10T14:30:00Z',
        duration: '5:15',
        viewCount: '89K',
        url: 'https://www.youtube.com/watch?v=mock2'
      },
      {
        id: 'mock3',
        title: 'Truck Hack - Roadside Fix That Actually Works',
        description: 'Professional truck driver reveals the roadside hack that gets trucks moving when nothing else works.',
        thumbnail: 'https://img.youtube.com/vi/mock3/mqdefault.jpg',
        channelTitle: 'Heavy Duty Hacks',
        publishedAt: '2024-01-05T09:15:00Z',
        duration: '3:45',
        viewCount: '156K',
        url: 'https://www.youtube.com/watch?v=mock3'
      }
    ];

    return {
      videos: mockVideos,
      totalResults: mockVideos.length,
      searchQuery: searchTerms.join(' ')
    };
  }

  /**
   * Get trending truck repair videos
   * @param {number} [maxResults=3]
   * @returns {Promise<YouTubeVideo[]>}
   */
  async getTrendingTruckVideos(maxResults = 3) {
    const trendingTerms = [
      'truck engine repair',
      'diesel engine problems',
      'semi truck maintenance',
      'heavy duty truck repair'
    ];

    const result = await this.searchTruckRepairVideos(trendingTerms, maxResults);
    return result.videos;
  }

  /**
   * Search for specific component repair videos
   * @param {string} component
   * @param {string} problem
   * @returns {Promise<YouTubeSearchResult>}
   */
  async searchComponentRepair(component, problem) {
    const searchTerms = [
      component,
      problem,
      'repair',
      'fix',
      'tutorial'
    ];

    return await this.searchTruckRepairVideos(searchTerms, 5);
  }
}
