import { SetMetadata } from '@nestjs/common';
import type { EntitlementKey } from './entitlements.service.js';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

// Usage: @RequireFeature('MOCK_TESTS') on a controller method (after JwtAuthGuard).
// The EntitlementsGuard reads it and rejects with FEATURE_LOCKED if missing.
export const RequireFeature = (key: EntitlementKey, upgradeHint?: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, { key, upgradeHint });
