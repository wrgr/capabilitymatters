/** Declare inspectable teaching datasets and their provenance without inferring anyone's identity. */
export const DATASETS = {
  haiku: {
    title: "Words in example haikus",
    groups: ["Rain and snow openings", "Wind and stars openings"],
    provenance:
      "Capability Matters original teaching text, composed from 12 source lines into 64 three-line poems. 48 train the model; 16 complete combinations are held out. Every source line occurs in training. No third-party poems are used.",
    limits:
      "These controlled examples use a 5/7/5 English syllable pattern with one-syllable words. Testing unseen combinations of familiar lines is a narrow check, not evidence of general poetic ability. The sampler does not enforce the full poem form; its available building blocks depend on the selected tokenization.",
  },
  fictional: {
    title: "Invented spelling patterns",
    groups: ["A · ending in -a", "B · ending in -o"],
    provenance:
      "Capability Matters' deterministic generator: seed 731, 96 unique strings per set, first 80 for training and final 16 held out. Neither set represents a population.",
    limits:
      "Invented patterns isolate exposure differences. They cannot establish how a real cultural or linguistic community would be served.",
  },
  names: {
    title: "Names and historical stereotypes",
    groups: [
      "A · White-associated study cues",
      "B · Black-associated study cues",
    ],
    provenance:
      "All 36 first names in Bertrand & Mullainathan (2004), Appendix Table A1. The authors selected cues for perceived race in a U.S. hiring study. Our lowercase conversion, ordering, split and training mixes are teaching choices; no hiring outcomes are used.",
    limits:
      "These associations belong to that historical study. Names do not establish race, culture, nationality, gender or ability. This small, selected list is not representative of any population. The model sees spelling only; group labels are used for sampling and auditing, never as model inputs.",
    source:
      "https://www.povertyactionlab.org/sites/default/files/research-paper/3%20A%20Field%20Experiment%20on%20Labor%20Market%20Discrimination%20Sep%2004.pdf#page=22",
  },
};
// The three tokenizations share the exact same poems and split.
DATASETS["haiku-char"] = {
  ...DATASETS.haiku,
  title: "Haikus · character tokens",
};
DATASETS["haiku-line"] = {
  ...DATASETS.haiku,
  title: "Haikus · whole-line tokens",
};
// Alphabetical order within each of the study's two sex categories; every third name is held out.
export const STUDY_NAMES = [
  "allison anne carrie emily jill kristen laurie meredith sarah brad brendan brett geoffrey greg jay matthew neil todd".split(
    " ",
  ),
  "aisha ebony keisha kenya lakisha latonya latoya tamika tanisha darnell hakim jamal jermaine kareem leroy rasheed tremayne tyrone".split(
    " ",
  ),
];
export const SCENARIOS = {
  balanced: {
    title: "Study names · equal exposure",
    dataset: "names",
    share: 0.5,
  },
  skewed: {
    title: "Study names · A gets 90% of training",
    dataset: "names",
    share: 0.9,
  },
  reversed: {
    title: "Study names · B gets 90% of training",
    dataset: "names",
    share: 0.1,
  },
};
/** @returns {{train:string[][],test:string[][]}} Split the published name lists using a fixed rule chosen before training. */
export function nameSplit() {
  return {
    train: STUDY_NAMES.map((names) => names.filter((_, i) => i % 3 !== 2)),
    test: STUDY_NAMES.map((names) => names.filter((_, i) => i % 3 === 2)),
  };
}
