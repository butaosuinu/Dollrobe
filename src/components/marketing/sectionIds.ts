export const SECTION_ID = Object.freeze({
  FEATURES: "features",
  STEPS: "steps",
  FAQ: "faq",
});

export type SectionId = (typeof SECTION_ID)[keyof typeof SECTION_ID];
