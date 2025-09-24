/**
 * Dynamic Pricing Service for Truck Repair Costs
 * Analyzes real-time pricing data from multiple sources including Reddit, forums, and local service centers
 */

export interface PricingSource {
  source: 'reddit' | 'forum' | 'service_center' | 'parts_supplier';
  url: string;
  title: string;
  content: string;
  date: string;
  location?: string;
  price: number;
  currency: string;
  confidence: number;
}

export interface RepairCostAnalysis {
  component: string;
  repairType: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  pricing: {
    labor: {
      min: number;
      max: number;
      average: number;
      currency: string;
    };
    parts: {
      min: number;
      max: number;
      average: number;
      currency: string;
    };
    total: {
      min: number;
      max: number;
      average: number;
      currency: string;
    };
  };
  timeEstimate: {
    min: string;
    max: string;
    average: string;
  };
  sources: PricingSource[];
  lastUpdated: string;
  confidence: number;
  trends: {
    priceChange: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    period: string;
  };
}

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  location?: string;
}

export class DynamicPricingService {
  private readonly REDDIT_API_BASE = 'https://www.reddit.com/r/';
  private readonly REDDIT_SUBREDDITS = [
    'Truckers',
    'Diesel',
    'MechanicAdvice',
    'TruckRepair',
    'CommercialVehicles',
    'FleetMaintenance'
  ];
  
  // Forum sources for future integration
  // private readonly FORUM_SOURCES = [
  //   'truckersreport.com',
  //   'bigmacktrucks.com',
  //   'truckdriversworldwide.com'
  // ];

  private cache = new Map<string, RepairCostAnalysis>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get dynamic repair cost analysis based on location and component
   */
  async getRepairCostAnalysis(
    component: string,
    repairType: string,
    location: { lat: number; lng: number; city?: string; state?: string }
  ): Promise<RepairCostAnalysis> {
    const cacheKey = `${component}-${repairType}-${location.lat}-${location.lng}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - new Date(cached.lastUpdated).getTime() < this.cacheExpiry) {
        return cached;
      }
    }

    try {
      // Get location details
      const locationDetails = await this.getLocationDetails(location);
      
      // Collect pricing data from multiple sources
      const [redditData, forumData, serviceCenterData] = await Promise.all([
        this.getRedditPricingData(component, repairType, locationDetails),
        this.getForumPricingData(component, repairType, locationDetails),
        this.getServiceCenterPricingData(component, repairType, location)
      ]);

      // Combine and analyze all sources
      const allSources = [...redditData, ...forumData, ...serviceCenterData];
      const analysis = this.analyzePricingData(allSources, component, repairType, locationDetails);

      // Cache the result
      this.cache.set(cacheKey, analysis);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiry);

      return analysis;
    } catch (error) {
      console.error('Error getting repair cost analysis:', error);
      return this.getFallbackPricing(component, repairType, location);
    }
  }

  /**
   * Get Reddit posts about truck repair costs from last 10 months
   */
  private async getRedditPricingData(
    component: string,
    repairType: string,
    location: { city: string; state: string; country: string }
  ): Promise<PricingSource[]> {
    const sources: PricingSource[] = [];
    const tenMonthsAgo = Math.floor((Date.now() - 10 * 30 * 24 * 60 * 60 * 1000) / 1000);

    for (const subreddit of this.REDDIT_SUBREDDITS) {
      try {
        const posts = await this.searchRedditPosts(subreddit, component, repairType, tenMonthsAgo);
        
        for (const post of posts) {
          const pricingInfo = this.extractPricingFromRedditPost(post, location);
          if (pricingInfo) {
            sources.push({
              source: 'reddit',
              url: `https://reddit.com${post.url}`,
              title: post.title,
              content: post.content,
              date: new Date(post.created_utc * 1000).toISOString(),
              location: post.location,
              price: pricingInfo.price,
              currency: pricingInfo.currency,
              confidence: pricingInfo.confidence
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch Reddit data from r/${subreddit}:`, error);
      }
    }

    return sources;
  }

  /**
   * Search Reddit posts using Reddit API
   */
  private async searchRedditPosts(
    subreddit: string,
    component: string,
    repairType: string,
    after: number
  ): Promise<RedditPost[]> {
    const searchTerms = [
      `${component} repair cost`,
      `${component} replacement price`,
      `${repairType} cost`,
      `truck ${component} fix price`
    ];

    const posts: RedditPost[] = [];

    for (const term of searchTerms) {
      try {
        const response = await fetch(
          `${this.REDDIT_API_BASE}${subreddit}/search.json?q=${encodeURIComponent(term)}&sort=new&t=year&after=${after}&limit=25`,
          {
            headers: {
              'User-Agent': 'TruckDiagnosticApp/1.0'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.children) {
            posts.push(...data.data.children.map((child: any) => child.data));
          }
        }
      } catch (error) {
        console.warn(`Reddit search failed for term "${term}":`, error);
      }
    }

    return posts;
  }

  /**
   * Extract pricing information from Reddit post content
   */
  private extractPricingFromRedditPost(
    post: RedditPost,
    location: { city: string; state: string; country: string }
  ): { price: number; currency: string; confidence: number } | null {
    const content = `${post.title} ${post.content}`.toLowerCase();
    
    // Look for price patterns
    const pricePatterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // $1,234.56
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars?/g,  // 1234 dollars
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*usd/g,  // 1234 USD
    ];

    const prices: number[] = [];
    let currency = 'USD';
    let confidence = 0.5;

    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price > 10 && price < 50000) { // Reasonable price range
          prices.push(price);
        }
      }
    }

    if (prices.length > 0) {
      // Check for location relevance
      const locationKeywords = [location.city.toLowerCase(), location.state.toLowerCase()];
      const hasLocationMatch = locationKeywords.some(keyword => 
        content.includes(keyword) && keyword.length > 2
      );
      
      if (hasLocationMatch) {
        confidence += 0.3;
      }

      // Check for recent posts (higher confidence for newer posts)
      const postAge = Date.now() - (post.created_utc * 1000);
      const monthsOld = postAge / (30 * 24 * 60 * 60 * 1000);
      if (monthsOld < 3) {
        confidence += 0.2;
      }

      return {
        price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        currency,
        confidence: Math.min(confidence, 1.0)
      };
    }

    return null;
  }

  /**
   * Get forum pricing data
   */
  private async getForumPricingData(
    _component: string,
    _repairType: string,
    _location: { city: string; state: string; country: string }
  ): Promise<PricingSource[]> {
    // This would integrate with forum scraping or API
    // For now, return empty array as forum integration requires more complex setup
    return [];
  }

  /**
   * Get service center pricing data
   */
  private async getServiceCenterPricingData(
    _component: string,
    _repairType: string,
    _location: { lat: number; lng: number }
  ): Promise<PricingSource[]> {
    // This would integrate with service center APIs or web scraping
    // For now, return empty array
    return [];
  }

  /**
   * Analyze all pricing data and generate cost analysis
   */
  private analyzePricingData(
    sources: PricingSource[],
    component: string,
    _repairType: string,
    location: { city: string; state: string; country: string }
  ): RepairCostAnalysis {
    if (sources.length === 0) {
      return this.getFallbackPricing(component, _repairType, { lat: 0, lng: 0, city: location.city, state: location.state });
    }

    // Filter and weight sources by confidence
    const weightedSources = sources.filter(s => s.confidence > 0.3);
    const prices = weightedSources.map(s => s.price);
    
    if (prices.length === 0) {
      return this.getFallbackPricing(component, _repairType, { lat: 0, lng: 0, city: location.city, state: location.state });
    }

    // Calculate statistics
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    // Estimate labor vs parts split (rough approximation)
    const laborRatio = this.getLaborRatio(component, _repairType);
    const partsRatio = 1 - laborRatio;

    // Calculate trends
    const recentSources = weightedSources.filter(s => {
      const sourceDate = new Date(s.date);
      const threeMonthsAgo = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000);
      return sourceDate > threeMonthsAgo;
    });

    const olderSources = weightedSources.filter(s => {
      const sourceDate = new Date(s.date);
      const threeMonthsAgo = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      return sourceDate > sixMonthsAgo && sourceDate <= threeMonthsAgo;
    });

    let priceChange: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let changePercent = 0;

    if (recentSources.length > 0 && olderSources.length > 0) {
      const recentAvg = recentSources.reduce((a, b) => a + b.price, 0) / recentSources.length;
      const olderAvg = olderSources.reduce((a, b) => a + b.price, 0) / olderSources.length;
      changePercent = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
      
      if (changePercent > 5) priceChange = 'increasing';
      else if (changePercent < -5) priceChange = 'decreasing';
    }

    return {
      component,
      repairType: _repairType,
      location,
      pricing: {
        labor: {
          min: Math.round(min * laborRatio),
          max: Math.round(max * laborRatio),
          average: Math.round(average * laborRatio),
          currency: 'USD'
        },
        parts: {
          min: Math.round(min * partsRatio),
          max: Math.round(max * partsRatio),
          average: Math.round(average * partsRatio),
          currency: 'USD'
        },
        total: {
          min,
          max,
          average,
          currency: 'USD'
        }
      },
      timeEstimate: this.getTimeEstimate(component, _repairType),
      sources: weightedSources,
      lastUpdated: new Date().toISOString(),
      confidence: Math.min(weightedSources.reduce((a, b) => a + b.confidence, 0) / weightedSources.length, 1.0),
      trends: {
        priceChange,
        changePercent,
        period: '3 months'
      }
    };
  }

  /**
   * Get location details from coordinates
   */
  private async getLocationDetails(location: { lat: number; lng: number; city?: string; state?: string }): Promise<{ city: string; state: string; country: string }> {
    if (location.city && location.state) {
      return {
        city: location.city,
        state: location.state,
        country: 'USA'
      };
    }

    // Use reverse geocoding API (Google Maps or similar)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const city = result.address_components.find((c: any) => c.types.includes('locality'))?.long_name || 'Unknown';
          const state = result.address_components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || 'Unknown';
          const country = result.address_components.find((c: any) => c.types.includes('country'))?.short_name || 'USA';
          
          return { city, state, country };
        }
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    return { city: 'Unknown', state: 'Unknown', country: 'USA' };
  }

  /**
   * Get labor ratio for different components
   */
  private getLaborRatio(component: string, _repairType: string): number {
    const laborRatios: Record<string, number> = {
      'engine': 0.6,
      'transmission': 0.7,
      'brakes': 0.4,
      'electrical': 0.8,
      'cooling': 0.5,
      'air_system': 0.6,
      'suspension': 0.5,
      'fuel_system': 0.6
    };

    return laborRatios[component.toLowerCase()] || 0.5;
  }

  /**
   * Get time estimate for repair
   */
  private getTimeEstimate(component: string, _repairType: string): { min: string; max: string; average: string } {
    const timeEstimates: Record<string, { min: string; max: string; average: string }> = {
      'engine': { min: '4 hours', max: '16 hours', average: '8 hours' },
      'transmission': { min: '6 hours', max: '24 hours', average: '12 hours' },
      'brakes': { min: '1 hour', max: '4 hours', average: '2 hours' },
      'electrical': { min: '2 hours', max: '8 hours', average: '4 hours' },
      'cooling': { min: '2 hours', max: '6 hours', average: '3 hours' },
      'air_system': { min: '3 hours', max: '8 hours', average: '5 hours' },
      'suspension': { min: '4 hours', max: '12 hours', average: '6 hours' },
      'fuel_system': { min: '3 hours', max: '10 hours', average: '5 hours' }
    };

    return timeEstimates[component.toLowerCase()] || { min: '2 hours', max: '8 hours', average: '4 hours' };
  }

  /**
   * Fallback pricing when no real data is available
   */
  private getFallbackPricing(
    component: string,
    _repairType: string,
    location: { lat: number; lng: number; city?: string; state?: string }
  ): RepairCostAnalysis {
    const basePrice = this.getBasePrice(component);
    const locationMultiplier = this.getLocationMultiplier(location);

    const adjustedPrice = Math.round(basePrice * locationMultiplier);

    return {
      component,
      repairType: _repairType,
      location: {
        city: location.city || 'Unknown',
        state: location.state || 'Unknown',
        country: 'USA'
      },
      pricing: {
        labor: {
          min: Math.round(adjustedPrice * 0.4),
          max: Math.round(adjustedPrice * 0.8),
          average: Math.round(adjustedPrice * 0.6),
          currency: 'USD'
        },
        parts: {
          min: Math.round(adjustedPrice * 0.2),
          max: Math.round(adjustedPrice * 0.6),
          average: Math.round(adjustedPrice * 0.4),
          currency: 'USD'
        },
        total: {
          min: Math.round(adjustedPrice * 0.6),
          max: Math.round(adjustedPrice * 1.4),
          average: adjustedPrice,
          currency: 'USD'
        }
      },
      timeEstimate: this.getTimeEstimate(component, _repairType),
      sources: [],
      lastUpdated: new Date().toISOString(),
      confidence: 0.3,
      trends: {
        priceChange: 'stable',
        changePercent: 0,
        period: 'N/A'
      }
    };
  }

  /**
   * Get base price for component
   */
  private getBasePrice(component: string): number {
    const basePrices: Record<string, number> = {
      'engine': 2500,
      'transmission': 3500,
      'brakes': 800,
      'electrical': 1200,
      'cooling': 900,
      'air_system': 1500,
      'suspension': 1800,
      'fuel_system': 1100
    };

    return basePrices[component.toLowerCase()] || 1500;
  }

  /**
   * Get location-based price multiplier
   */
  private getLocationMultiplier(location: { lat: number; lng: number; city?: string; state?: string }): number {
    // High-cost areas
    const highCostStates = ['CA', 'NY', 'NJ', 'CT', 'MA', 'HI', 'AK'];
    const highCostCities = ['San Francisco', 'New York', 'Los Angeles', 'Boston', 'Seattle'];

    if (location.state && highCostStates.includes(location.state)) {
      return 1.3;
    }

    if (location.city && highCostCities.some(city => location.city?.includes(city))) {
      return 1.4;
    }

    // Low-cost areas
    const lowCostStates = ['MS', 'AL', 'AR', 'OK', 'KS', 'NE', 'SD', 'ND'];
    if (location.state && lowCostStates.includes(location.state)) {
      return 0.8;
    }

    return 1.0; // Average cost
  }
}
