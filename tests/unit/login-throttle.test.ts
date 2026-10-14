import { describe, expect, it } from "vitest";
import {
  clearLoginThrottle,
  isLoginThrottled,
  loginThrottleKey,
  recordFailedLogin,
} from "@server/services/login-throttle";

describe("login throttle", () => {
  it("throttles after 5 failures inside the window", () => {
    const key = loginThrottleKey("vokal1", "test-throttle-1");
    clearLoginThrottle(key);
    for (let i = 0; i < 5; i += 1) recordFailedLogin(key, 1000);
    expect(isLoginThrottled(key, 2000)).toBe(true);
    clearLoginThrottle(key);
    expect(isLoginThrottled(key, 2000)).toBe(false);
  });

  it("resets after the window expires", () => {
    const key = loginThrottleKey("vokal1", "test-throttle-2");
    clearLoginThrottle(key);
    for (let i = 0; i < 5; i += 1) recordFailedLogin(key, 0);
    expect(isLoginThrottled(key, 10 * 60 * 1000 + 1)).toBe(false);
    clearLoginThrottle(key);
  });
});
