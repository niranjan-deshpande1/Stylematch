import { InspirationImage, UserSwipe } from "@shared/schema";

export interface SwipeData {
  imageId: number;
  direction: 'like' | 'dislike';
  styleTags: string[];
  swipeOrder: number;
}

export interface GenderAnalysis {
  preferredGender: 'male' | 'female' | 'unisex';
  confidence: number;
  needsMoreData: boolean;
}

export interface StyleProfile {
  colorProfile: Record<string, number>;
  silhouetteProfile: Record<string, number>;
  occasionProfile: Record<string, number>;
  aestheticProfile: Record<string, number>;
  confidence: number;
  dominantStyle: string;
}

export interface RecommendationContext {
  phase: 'gender' | 'style' | 'refinement';
  genderAnalysis: GenderAnalysis;
  styleProfile: Partial<StyleProfile>;
  swipeCount: number;
}

export class RecommendationEngine {
  // Determine what discovery phase we're in
  determineDiscoveryPhase(swipeHistory: SwipeData[]): 'gender' | 'style' | 'refinement' {
    if (swipeHistory.length <= 3) return 'gender';

    const genderAnalysis = this.analyzeGenderPreference(swipeHistory);
    if (genderAnalysis.needsMoreData) return 'gender';

    if (swipeHistory.length <= 7) return 'style';
    return 'refinement';
  }

  // Analyze gender preference from swipe history
  analyzeGenderPreference(swipeHistory: SwipeData[]): GenderAnalysis {
    const likedImages = swipeHistory.filter(s => s.direction === 'like');

    if (likedImages.length === 0) {
      return { preferredGender: 'unisex', confidence: 0, needsMoreData: true };
    }

    // Score gender signals from style tags
    let maleScore = 0;
    let femaleScore = 0;
    let unisexScore = 0;

    likedImages.forEach(swipe => {
      const tags = swipe.styleTags.join(' ').toLowerCase();

      // Male indicators
      if (tags.includes('suit') || tags.includes('masculine') || tags.includes('menswear')) {
        maleScore += 2;
      }

      // Female indicators
      if (tags.includes('dress') || tags.includes('feminine') || tags.includes('skirt')) {
        femaleScore += 2;
      }

      // Unisex indicators
      if (tags.includes('unisex') || tags.includes('androgynous') || tags.includes('neutral')) {
        unisexScore += 1;
      }

      // Secondary indicators
      if (tags.includes('casual') || tags.includes('streetwear') || tags.includes('jeans')) {
        unisexScore += 0.5;
      }
    });

    const totalScore = maleScore + femaleScore + unisexScore;
    if (totalScore === 0) {
      return { preferredGender: 'unisex', confidence: 0, needsMoreData: true };
    }

    const maxScore = Math.max(maleScore, femaleScore, unisexScore);
    const confidence = maxScore / totalScore;

    const preferredGender = maxScore === maleScore ? 'male' :
                           maxScore === femaleScore ? 'female' : 'unisex';

    return {
      preferredGender,
      confidence,
      needsMoreData: confidence < 0.6 || likedImages.length < 2
    };
  }

  // Analyze style preferences from swipe patterns
  analyzeStylePreferences(swipeHistory: SwipeData[]): Partial<StyleProfile> {
    const liked = swipeHistory.filter(s => s.direction === 'like');
    const disliked = swipeHistory.filter(s => s.direction === 'dislike');

    const colorProfile = this.analyzeColorPreferences(liked, disliked);
    const silhouetteProfile = this.analyzeSilhouettePreferences(liked, disliked);
    const occasionProfile = this.analyzeOccasionPreferences(liked, disliked);
    const aestheticProfile = this.analyzeAestheticPreferences(liked, disliked);

    return {
      colorProfile,
      silhouetteProfile,
      occasionProfile,
      aestheticProfile,
      confidence: this.calculateStyleConfidence(swipeHistory)
    };
  }

  private analyzeColorPreferences(liked: SwipeData[], disliked: SwipeData[]): Record<string, number> {
    const colors: Record<string, number> = {};

    liked.forEach(swipe => {
      swipe.styleTags.forEach(tag => {
        const colorWords = ['black', 'white', 'grey', 'gray', 'brown', 'blue', 'red', 'green', 'pink', 'yellow', 'purple', 'neutral', 'bold', 'bright', 'dark', 'light'];
        if (colorWords.some(color => tag.toLowerCase().includes(color))) {
          colors[tag] = (colors[tag] || 0) + 1;
        }
      });
    });

    // Penalize disliked colors
    disliked.forEach(swipe => {
      swipe.styleTags.forEach(tag => {
        const colorWords = ['black', 'white', 'grey', 'gray', 'brown', 'blue', 'red', 'green', 'pink', 'yellow', 'purple', 'neutral', 'bold', 'bright', 'dark', 'light'];
        if (colorWords.some(color => tag.toLowerCase().includes(color))) {
          colors[tag] = (colors[tag] || 0) - 0.5;
        }
      });
    });

    return colors;
  }

  private analyzeSilhouettePreferences(liked: SwipeData[], disliked: SwipeData[]): Record<string, number> {
    const silhouettes: Record<string, number> = {};

    liked.forEach(swipe => {
      swipe.styleTags.forEach(tag => {
        const silhouetteWords = ['fitted', 'loose', 'baggy', 'tight', 'oversized', 'cropped', 'wide', 'slim', 'relaxed', 'structured'];
        if (silhouetteWords.some(sil => tag.toLowerCase().includes(sil))) {
          silhouettes[tag] = (silhouettes[tag] || 0) + 1;
        }
      });
    });

    return silhouettes;
  }

  private analyzeOccasionPreferences(liked: SwipeData[], disliked: SwipeData[]): Record<string, number> {
    const occasions: Record<string, number> = {};

    liked.forEach(swipe => {
      swipe.styleTags.forEach(tag => {
        const occasionWords = ['casual', 'formal', 'work', 'party', 'everyday', 'special', 'weekend', 'professional', 'athleisure', 'streetwear'];
        if (occasionWords.some(occ => tag.toLowerCase().includes(occ))) {
          occasions[tag] = (occasions[tag] || 0) + 1;
        }
      });
    });

    return occasions;
  }

  private analyzeAestheticPreferences(liked: SwipeData[], disliked: SwipeData[]): Record<string, number> {
    const aesthetics: Record<string, number> = {};

    liked.forEach(swipe => {
      swipe.styleTags.forEach(tag => {
        const aestheticWords = ['minimalist', 'maximalist', 'classic', 'trendy', 'edgy', 'romantic', 'sporty', 'bohemian', 'vintage', 'modern'];
        if (aestheticWords.some(aes => tag.toLowerCase().includes(aes))) {
          aesthetics[tag] = (aesthetics[tag] || 0) + 1;
        }
      });
    });

    return aesthetics;
  }

  private calculateStyleConfidence(swipeHistory: SwipeData[]): number {
    const likedCount = swipeHistory.filter(s => s.direction === 'like').length;
    const totalCount = swipeHistory.length;

    if (totalCount === 0) return 0;

    // Higher confidence with more data and clear preferences
    const dataConfidence = Math.min(totalCount / 8, 1); // Max confidence at 8 swipes
    const preferenceClarity = likedCount > 0 ? likedCount / totalCount : 0;

    return (dataConfidence + preferenceClarity) / 2;
  }

  // Score how well an image matches user preferences
  scoreImageForUser(image: InspirationImage, context: RecommendationContext): number {
    let score = 0;
    const tags = image.styleTags;

    // Gender matching (high priority in gender phase)
    if (context.phase === 'gender') {
      const genderMatch = this.scoreGenderMatch(tags, context.genderAnalysis);
      score += genderMatch * 10; // High weight for gender phase
    }

    // Style preference matching
    if (context.styleProfile) {
      score += this.scoreStyleMatch(tags, context.styleProfile) * 5;
    }

    // Diversity bonus (avoid repetitive recommendations)
    score += Math.random() * 2; // Small randomness for variety

    return score;
  }

  private scoreGenderMatch(tags: string[], genderAnalysis: GenderAnalysis): number {
    const tagString = tags.join(' ').toLowerCase();

    switch (genderAnalysis.preferredGender) {
      case 'male':
        if (tagString.includes('masculine') || tagString.includes('menswear') || tagString.includes('suit')) return 1;
        if (tagString.includes('unisex') || tagString.includes('casual')) return 0.5;
        return 0;
      case 'female':
        if (tagString.includes('feminine') || tagString.includes('dress') || tagString.includes('skirt')) return 1;
        if (tagString.includes('unisex') || tagString.includes('casual')) return 0.5;
        return 0;
      case 'unisex':
        if (tagString.includes('unisex') || tagString.includes('androgynous')) return 1;
        return 0.3; // Neutral score for all images
    }
  }

  private scoreStyleMatch(tags: string[], styleProfile: Partial<StyleProfile>): number {
    let score = 0;
    let matchCount = 0;

    // Safety check for tags
    if (!tags || !Array.isArray(tags)) {
      return 0;
    }

    // Check each tag against user preferences
    tags.forEach(tag => {
      // Color preferences
      if (styleProfile.colorProfile && styleProfile.colorProfile[tag] && styleProfile.colorProfile[tag] > 0) {
        score += styleProfile.colorProfile[tag];
        matchCount++;
      }

      // Silhouette preferences
      if (styleProfile.silhouetteProfile && styleProfile.silhouetteProfile[tag] && styleProfile.silhouetteProfile[tag] > 0) {
        score += styleProfile.silhouetteProfile[tag];
        matchCount++;
      }

      // Occasion preferences
      if (styleProfile.occasionProfile && styleProfile.occasionProfile[tag] && styleProfile.occasionProfile[tag] > 0) {
        score += styleProfile.occasionProfile[tag];
        matchCount++;
      }

      // Aesthetic preferences
      if (styleProfile.aestheticProfile && styleProfile.aestheticProfile[tag] && styleProfile.aestheticProfile[tag] > 0) {
        score += styleProfile.aestheticProfile[tag];
        matchCount++;
      }
    });

    return matchCount > 0 ? score / matchCount : 0;
  }

  // Check if we have enough data to complete onboarding
  shouldCompleteOnboarding(swipeHistory: SwipeData[]): boolean {
    if (swipeHistory.length < 6) return false; // Minimum swipes

    const genderAnalysis = this.analyzeGenderPreference(swipeHistory);
    const styleProfile = this.analyzeStylePreferences(swipeHistory);

    // Need confident gender detection and some style preferences
    return !genderAnalysis.needsMoreData &&
           styleProfile.confidence! > 0.4 &&
           swipeHistory.length >= 8; // Complete at 8+ swipes with good data
  }

  // Get next recommendation based on current context
  async getNextRecommendation(
    availableImages: InspirationImage[],
    swipeHistory: SwipeData[]
  ): Promise<InspirationImage | null> {
    const context: RecommendationContext = {
      phase: this.determineDiscoveryPhase(swipeHistory),
      genderAnalysis: this.analyzeGenderPreference(swipeHistory),
      styleProfile: this.analyzeStylePreferences(swipeHistory),
      swipeCount: swipeHistory.length
    };

    // Filter out already seen images
    const seenImageIds = new Set(swipeHistory.map(s => s.imageId));
    const unseenImages = availableImages.filter(img => !seenImageIds.has(img.id));

    if (unseenImages.length === 0) return null;

    // Score all unseen images
    const scoredImages = unseenImages.map(image => ({
      image,
      score: this.scoreImageForUser(image, context)
    }));

    // Sort by score and return the best match
    scoredImages.sort((a, b) => b.score - a.score);

    return scoredImages[0].image;
  }
}

export const recommendationEngine = new RecommendationEngine();