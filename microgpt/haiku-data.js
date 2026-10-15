/** Compose original teaching haikus with an inspectable split and a training-only whole-word vocabulary. */
export const HAIKU_LINES = [
  [
    "rain taps the old roof",
    "snow rests on bare fields",
    "wind bends the tall reeds",
    "stars shine on still ponds",
  ],
  [
    "a small bird waits for the dawn",
    "the light slips through a cracked door",
    "cold streams run past the dark pines",
    "soft waves bring shells back to shore",
  ],
  [
    "one leaf drifts from sight",
    "night folds round the hill",
    "wet stones gleam at dusk",
    "new shoots reach for light",
  ],
];
/** @returns {{train:string[][],test:string[][]}} Hold out complete combinations while keeping every source line in training. */
export function haikuSplit() {
  const train = [[], []],
    test = [[], []];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++) {
        const poem = [
          HAIKU_LINES[0][i],
          HAIKU_LINES[1][j],
          HAIKU_LINES[2][k],
        ].join("\n");
        const split = (i + j + k) % 4 === 0 ? test : train;
        split[i < 2 ? 0 : 1].push(poem);
      }
  return { train, test };
}
/** @param {string} text @returns {string[]} Preserve line breaks as explicit tokens between whole words. */
export function wordTokens(text) {
  return text
    .split("\n")
    .flatMap((line, i) => [...(i ? ["\n"] : []), ...line.split(" ")]);
}
export const HAIKU_VOCAB = [
  ...new Set(haikuSplit().train.flat().flatMap(wordTokens)),
].sort();
/** @param {string[]} tokens @returns {string} Render the sampled words and learned line-break tokens without imposing a poem form. */
export function joinWords(tokens) {
  return tokens.join(" ").replace(/ *\n */g, "\n");
}
