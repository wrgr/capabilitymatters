/** Define character, word and whole-line tokenizations of the same training poems without using held-out vocabulary. */
import {
  haikuSplit,
  wordTokens,
  joinWords,
  HAIKU_VOCAB,
} from "./haiku-data.js";
const training = haikuSplit().train.flat();
export const HAIKU_MODES = {
  "haiku-char": {
    label: "Characters",
    unit: "character",
    context: Math.max(...training.map((p) => p.length)) + 1,
    vocabulary: [...new Set(training.join(""))].sort(),
    explanation:
      "Each letter, space and line break is a token. The model can make unfamiliar words by combining characters; it has to learn spelling and spacing as well as the poem's structure.",
  },
  haiku: {
    label: "Words",
    unit: "word or line-break",
    context: 20,
    vocabulary: HAIKU_VOCAB,
    explanation:
      "Each whole word is a token, and a line break is another token. The model can make new lines from familiar words, but cannot spell a word outside its vocabulary. Spaces between sampled words are formatting.",
  },
  "haiku-line": {
    label: "Whole lines",
    unit: "line",
    context: 4,
    vocabulary: [...new Set(training.flatMap((p) => p.split("\n")))].sort(),
    explanation:
      "Each entire source line is one token. The model can only choose and order these 12 fixed lines; it cannot change a word inside a line. Newlines between sampled line tokens are formatting, not separately predicted tokens.",
  },
};
/** @param {string} id @returns {boolean} Recognize only the three declared haiku tokenizations. */
export function isHaiku(id) {
  return Object.hasOwn(HAIKU_MODES, id);
}
/** @param {string} text @param {string} id @returns {string[]} Encode a complete example using the selected token unit. */
export function splitTokens(text, id) {
  if (id === "haiku") return wordTokens(text);
  if (id === "haiku-line") return text.split("\n");
  return [...text];
}
/** @param {string[]} pieces @param {string} id @returns {string} Preserve model choices while adding only the selected tokenization's separators. */
export function joinTokens(pieces, id) {
  if (id === "haiku") return joinWords(pieces);
  return pieces.join(id === "haiku-line" ? "\n" : "");
}
