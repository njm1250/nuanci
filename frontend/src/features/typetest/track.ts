"use client";

import { sendEvent } from "@/features/scene/track";

type TestEvent = "test_viewed" | "test_started" | "test_answered" | "test_completed" | "test_shared" | "test_result_viewed";

// 테스트 이용 이벤트. 결과 유형은 choiceId에, 친구 링크로 들어왔는지는 entry에 담는다. 실패해도 테스트를 막지 않는다
export function trackTest(type: TestEvent, extra: { choiceId?: string; entry?: "share" | "direct" } = {}) {
  sendEvent({ type, ...extra });
}
