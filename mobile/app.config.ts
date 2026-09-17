import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const preview = process.env.DOCSETU_BUILD_PROFILE === "preview";
  return {
    ...config,
    name: preview ? "DocSetu Preview" : "DocSetu",
    slug: "docsetu",
    scheme: preview ? "docsetu-preview" : "docsetu",
    android: {
      ...config.android,
      package: preview ? "com.docsetu.mobile.preview" : "com.docsetu.mobile",
    },
  };
};
