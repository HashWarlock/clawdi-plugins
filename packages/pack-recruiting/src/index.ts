interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "draft_offer",
    description: "Draft an offer letter with compensation details",
    handler: async () => ({
      text: "Use the recruiting-draft-offer skill. Ask the user for the role and level.",
    }),
  });
}
