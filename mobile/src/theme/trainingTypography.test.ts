// Exercise both native Platform.select branches rather than only Jest's iOS default.
it.each([["android", "sans-serif"], ["ios", "System"]] as const)("resolves all Train/picker roles to %s system sans-serif", (os, expected) => {
  jest.isolateModules(() => {
    jest.doMock("react-native", () => ({
      Platform: { OS: os, select: (options: Record<string, string>) => options[os] ?? options.default },
      StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    }));
    const design = jest.requireActual<typeof import("./design")>("./design");
    expect(design.fontFamily).toBe(expected);
    for (const role of Object.values(design.type)) expect(role.fontFamily).toBe(expected);
    expect(design.ui.input.fontFamily).toBe(expected);
  });
  jest.dontMock("react-native");
});
