import type { ClaimInput, ReviewResult } from "@/types/claim";

/**
 * Review service interface.
 *
 * Production swap-in points:
 *  - FastAPI / Python pipeline endpoint
 *  - OpenAI Vision, Gemini multimodal, or Claude Vision
 *  - Local VLM service
 *
 * The UI layer must depend on this interface only.
 */
export interface ReviewService {
  reviewClaim(
    input: ClaimInput,
    onStage?: (stage: string, progress: number) => void,
  ): Promise<ReviewResult>;
}

import { MockReviewService } from "./mockReviewService";

// TODO: Replace with ProductionReviewService once the FastAPI backend is wired.
export const reviewService: ReviewService = new MockReviewService();
