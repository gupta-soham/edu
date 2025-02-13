// src/services/rateLimiter.ts
interface RateLimit {
    max: number;
    windowMs: number;
    current: number;
    resetTime: number;
}

interface UserRateLimits {
    minutely: RateLimit;
    hourly: RateLimit;
    daily: RateLimit;
}

class RateLimiter {
    private limits: Map<string, UserRateLimits> = new Map();

    private createLimit(max: number, windowMs: number): RateLimit {
        return {
            max,
            windowMs,
            current: 0,
            resetTime: Date.now() + windowMs
        };
    }

    private createUserLimits(): UserRateLimits {
        return {
            minutely: this.createLimit(15, 60 * 1000),
            hourly: this.createLimit(250, 60 * 60 * 1000),
            daily: this.createLimit(500, 24 * 60 * 60 * 1000)
        };
    }

    private updateLimit(limit: RateLimit): boolean {
        const now = Date.now();

        if (now > limit.resetTime) {
            limit.current = 0;
            limit.resetTime = now + limit.windowMs;
        }

        if (limit.current >= limit.max) {
            return false;
        }

        limit.current++;
        return true;
    }

    public checkRateLimit(sessionId: string): boolean {
        if (!this.limits.has(sessionId)) {
            this.limits.set(sessionId, this.createUserLimits());
        }

        const userLimits = this.limits.get(sessionId)!;

        return (
            this.updateLimit(userLimits.minutely) &&
            this.updateLimit(userLimits.hourly) &&
            this.updateLimit(userLimits.daily)
        );
    }

    public getRateLimitInfo(sessionId: string): {
        minutely: { remaining: number; resetIn: number };
        hourly: { remaining: number; resetIn: number };
        daily: { remaining: number; resetIn: number };
    } {
        const limits = this.limits.get(sessionId);
        if (!limits) {
            return {
                minutely: { remaining: 15, resetIn: 0 },
                hourly: { remaining: 250, resetIn: 0 },
                daily: { remaining: 500, resetIn: 0 }
            };
        }

        const now = Date.now();
        return {
            minutely: {
                remaining: Math.max(0, limits.minutely.max - limits.minutely.current),
                resetIn: Math.max(0, limits.minutely.resetTime - now)
            },
            hourly: {
                remaining: Math.max(0, limits.hourly.max - limits.hourly.current),
                resetIn: Math.max(0, limits.hourly.resetTime - now)
            },
            daily: {
                remaining: Math.max(0, limits.daily.max - limits.daily.current),
                resetIn: Math.max(0, limits.daily.resetTime - now)
            }
        };
    }
}

export const rateLimiter = new RateLimiter();