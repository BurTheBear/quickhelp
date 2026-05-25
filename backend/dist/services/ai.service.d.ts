export declare const aiService: {
    /**
     * Moderate content for safety and auto-categorize.
     * Returns safetyScore (0-1, higher = safer) and suggested category.
     */
    moderateAndCategorize(title: string, description: string): Promise<{
        safetyScore: number;
        category: string;
    }>;
    /**
     * Generate volunteer match scores based on profile compatibility.
     */
    rankVolunteers(request: {
        title: string;
        description: string;
        category: string;
        requiredSkills: string[];
    }, volunteers: Array<{
        id: string;
        skills: string[];
        tasksCompleted: number;
        avgRating: number;
        distance: number;
    }>): Promise<Array<{
        id: string;
        score: number;
    }>>;
    /**
     * Generate smart notification copy for nearby volunteer alerts.
     */
    generateNotificationCopy(category: string, urgency: string, distance: number): Promise<{
        title: string;
        body: string;
    }>;
};
//# sourceMappingURL=ai.service.d.ts.map