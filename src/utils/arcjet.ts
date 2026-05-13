import { config } from "../config/app-config";

let ajInstance: any = null;

export async function getArcjet() {
  if (!ajInstance) {
    const { default: arcjet, shield, detectBot, tokenBucket, validateEmail } = await import("@arcjet/node");
    
    ajInstance = arcjet({
      key: config.ARCJET_KEY,
      rules: [
        shield({ mode: "LIVE" }),
        validateEmail({
          mode: "LIVE",
          deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
        }),
        detectBot({
          mode: "LIVE",
          allow: ["CATEGORY:SEARCH_ENGINE"],
        }),
        tokenBucket({
          mode: "LIVE",
          refillRate: 5,
          interval: 10,
          capacity: 10,
        }),
      ],
    });
  }
  return ajInstance;
}