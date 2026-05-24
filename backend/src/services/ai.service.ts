import OpenAI from 'openai';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient && config.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  if (!openaiClient) throw new Error('OpenAI not configured');
  return openaiClient;
}

const CATEGORIES = [
  'ELDERLY_ASSISTANCE', 'TUTORING', 'FOOD_DELIVERY',
  'COMMUNITY_CLEANUP', 'PET_HELP', 'TECH_SUPPORT',
  'TRANSPORTATION', 'EMERGENCY', 'OTHER',
];

export const aiService = {
  /**
   * Moderate content for safety and auto-categorize.
   * Returns safetyScore (0-1, higher = safer) and suggested category.
   */
  async moderateAndCategorize(
    title: string,
    description: string
  ): Promise<{ safetyScore: number; category: string }> {
    if (!config.OPENAI_API_KEY) {
      return { safetyScore: 1.0, category: 'OTHER' };
    }

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a content moderation AI for a community volunteering app.
Analyze help requests for safety and appropriateness.
Respond ONLY with valid JSON in this exact format:
{
  "safetyScore": <float 0.0-1.0>,
  "category": "<one of: ${CATEGORIES.join(', ')}>",
  "flags": ["<list any concerns, empty array if none>"]
}

Safety score guide:
- 1.0: Completely safe, genuine help request
- 0.7-0.9: Safe with minor concerns
- 0.4-0.6: Moderate concerns, needs human review
- 0.1-0.3: Likely harmful or policy-violating
- 0.0: Clear policy violation (scam, dangerous activity)`,
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nDescription: ${description}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');

      const parsed = JSON.parse(content) as { safetyScore: number; category: string };
      return {
        safetyScore: Math.max(0, Math.min(1, parsed.safetyScore)),
        category: CATEGORIES.includes(parsed.category) ? parsed.category : 'OTHER',
      };
    } catch (err) {
      logger.error('AI moderation failed:', err);
      return { safetyScore: 0.8, category: 'OTHER' }; // Default safe, fail open
    }
  },

  /**
   * Generate volunteer match scores based on profile compatibility.
   */
  async rankVolunteers(
    request: { title: string; description: string; category: string; requiredSkills: string[] },
    volunteers: Array<{ id: string; skills: string[]; tasksCompleted: number; avgRating: number; distance: number }>
  ): Promise<Array<{ id: string; score: number }>> {
    if (!config.OPENAI_API_KEY || volunteers.length === 0) {
      // Fallback: simple scoring without AI
      return volunteers.map((v) => ({
        id: v.id,
        score:
          (v.avgRating / 5) * 0.3 +
          (Math.min(v.tasksCompleted, 100) / 100) * 0.3 +
          (1 / (1 + v.distance)) * 0.4,
      }));
    }

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `Score volunteer-request compatibility. Return JSON array of {id, score} pairs, score 0-1.
Consider: skill match, experience, rating, proximity. Higher score = better match.`,
          },
          {
            role: 'user',
            content: JSON.stringify({ request, volunteers }),
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response');

      return JSON.parse(content) as Array<{ id: string; score: number }>;
    } catch (err) {
      logger.error('AI ranking failed, using fallback:', err);
      return volunteers.map((v) => ({
        id: v.id,
        score: (v.avgRating / 5) * 0.4 + (1 / (1 + v.distance)) * 0.6,
      }));
    }
  },

  /**
   * Generate smart notification copy for nearby volunteer alerts.
   */
  async generateNotificationCopy(
    category: string,
    urgency: string,
    distance: number
  ): Promise<{ title: string; body: string }> {
    const urgencyText = urgency === 'EMERGENCY' ? '🚨 URGENT' : urgency === 'HIGH' ? '⚡ High priority' : 'New';
    const categoryEmoji: Record<string, string> = {
      ELDERLY_ASSISTANCE: '👴',
      TUTORING: '📚',
      FOOD_DELIVERY: '🍕',
      COMMUNITY_CLEANUP: '🌿',
      PET_HELP: '🐾',
      TECH_SUPPORT: '💻',
      TRANSPORTATION: '🚗',
      EMERGENCY: '🚨',
    };

    return {
      title: `${urgencyText} help request nearby`,
      body: `${categoryEmoji[category] ?? '🤝'} Someone needs help ${distance < 1 ? 'less than 1km' : `${distance.toFixed(1)}km`} away — can you assist?`,
    };
  },
};
