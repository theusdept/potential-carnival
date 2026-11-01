import { describe, expect, it } from "vitest";
import { parseCustomerPayload } from "./privacy.server";

describe("privacy event parsing", () => {
  it("accepts a signed-hook customer ID", () => {
    expect(parseCustomerPayload({customer:{id:123,email:"person@example.com"}}))
      .toEqual({customerId:"gid://shopify/Customer/123",email:"person@example.com"});
  });
  it("rejects malformed customer objects", () => {
    expect(parseCustomerPayload({customer:{id:"../etc/passwd"}})).toBeNull();
    expect(parseCustomerPayload({customer:{id:-5}})).toBeNull();
    expect(parseCustomerPayload({})).toBeNull();
  });
});
