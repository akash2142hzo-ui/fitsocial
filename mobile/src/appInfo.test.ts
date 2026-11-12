import { appName } from "./appInfo";

describe("mobile bootstrap", () => {
  it("exposes the application name", () => {
    expect(appName).toBe("FitSocial");
  });
});
