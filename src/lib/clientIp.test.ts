import { describe, it, expect, afterEach } from "vitest";
import { getClientIp } from "./clientIp";

const h = (xff: string, extra: Record<string, string> = {}) =>
  new Headers({ "x-forwarded-for": xff, ...extra });

describe("getClientIp", () => {
  afterEach(() => {
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  it("takes the first hop by default (Vercel overwrites x-forwarded-for)", () => {
    expect(getClientIp(h("203.0.113.7, 10.0.0.1"))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
  });

  it("rejects values that are not IP addresses", () => {
    expect(getClientIp(h("not-an-ip"))).toBeNull();
    expect(getClientIp(new Headers())).toBeNull();
  });

  describe("TRUSTED_PROXY_HOPS", () => {
    it("takes the Nth entry from the right, ignoring client-prepended hops", () => {
      process.env.TRUSTED_PROXY_HOPS = "1";
      // The client forged 6.6.6.6; the load balancer appended the real peer.
      expect(getClientIp(h("6.6.6.6, 203.0.113.7"))).toBe("203.0.113.7");
    });

    it("counts through multiple trusted proxies", () => {
      process.env.TRUSTED_PROXY_HOPS = "2";
      expect(getClientIp(h("6.6.6.6, 203.0.113.7, 10.0.0.1"))).toBe(
        "203.0.113.7",
      );
    });

    it("trusts nothing when there are fewer entries than hops", () => {
      process.env.TRUSTED_PROXY_HOPS = "2";
      expect(getClientIp(h("203.0.113.7"))).toBeNull();
    });
  });
});
