/** Plain-language explanations map every computational stage to the source actually running in the browser. */
export const GUIDE = {
  letters: {
    title: "Example 1: predict the next letter",
    file: "engine.js",
    start: "loss(word)",
    end: "/** @returns {number} Perform",
    paragraphs: [
      "A token is one item the model predicts. In this example, each letter is one token. There are 26 letter IDs and one boundary ID. loss() adds a boundary at each end of a string, predicts every next token in order, and averages the error. The source excerpt is the actual computation.",
      "The training pool contains 160 invented strings, and 32 different strings are held out. They follow two simple spelling rules, sampled equally here. Open the data inspector to see every exact string and select one to see its token IDs. The training loss is measured on a fixed 16-string probe.",
      "One update uses one complete string. Evaluation and generation do not update weights. A fixed random seed makes a run repeatable. Ready-made checkpoints contain actual learned weights, not staged outputs.",
      "This model has 2,520 parameters. The next example changes the tokens to words, which changes the vocabulary, context length and parameter count. Its loss is per word or line-break token, so the two loss values are not a like-for-like capability comparison.",
    ],
    question:
      "What evidence distinguishes improved spelling prediction from understanding a word?",
  },
  haiku: {
    title: "Example 2: compare tokens on the same haikus",
    file: "haiku-data.js",
    start: null,
    end: null,
    paragraphs: [
      "HAIKU_LINES contains 12 original Capability Matters teaching lines: four openings, four middle lines and four endings. Their English words each use one syllable, producing 5/7/5 example lines. haikuSplit() combines them into 64 poems. This is a controlled teaching corpus, not a claim to represent haiku traditions or literary quality.",
      "For line indices i, j and k, combinations with (i+j+k) divisible by four are held out. This leaves 48 training poems and 16 test poems. Every source line appears in training; the test checks new combinations of familiar lines. It is deliberately easier than writing about an unfamiliar topic.",
      "The default word mode uses wordTokens(), which splits at spaces and preserves each line break as its own token. The vocabulary is derived only from the training poems, then sorted to give stable IDs. In word mode there are 59 words, one line-break token and one boundary token: 61 IDs. The inspector shows the exact mapping. An unknown word is rejected, never silently dropped.",
      "In word mode, the same transformer calculations use a 61-row embedding/output vocabulary and 20 positions, for 3,432 parameters. Training predicts the 17 words, two line breaks and final boundary of each poem. The data has a 5/7/5 form; sampling itself does not enforce it. joinWords() only inserts spaces around the sampled words and preserves sampled line breaks. The selector also provides character and whole-line models on this exact same corpus.",
      "The three generated samples are the first three draws from the current model with seed 2026. They can recombine or repeat training text, stop early, or break the form. A smaller held-out loss supports only better prediction on this particular recombination test.",
    ],
    question:
      "What does holding out a combination test, and what would require entirely new source material?",
  },
  tokenization: {
    title: "Character, word or line: what is one token?",
    file: "haiku-tokens.js",
    start: null,
    end: null,
    paragraphs: [
      "The inspector encodes the same selected poem in all three modes. Character mode gives every character, including spaces and newlines, a token. Word mode uses a whole word or newline. Line mode uses one complete source line. Start and end use a shared boundary ID that is separate from all content tokens.",
      "All vocabularies come only from the same 48 training poems. There are 24 character IDs, 61 word/line-break IDs, or 13 whole-line IDs, including each mode's boundary. IDs are local to a vocabulary: a number in one mode does not carry the same meaning in another.",
      "splitTokens() performs the selected split. joinTokens() reconstructs only those selected tokens. Character mode adds no separators. Word mode adds spaces between words while preserving sampled newline tokens. Line mode inserts newlines between sampled whole-line tokens; its internal words and spelling are fixed in advance.",
      "The model must fit a complete training example, so context capacities are 93 character positions, 20 word positions, or 4 line positions, including the final boundary prediction. The parameter counts are 3,420, 3,432 and 2,088 respectively. A longer character sequence also needs more differentiation memory and compute. The worker yields after each character-mode update to keep pause responsive.",
      "Changing the selector starts a fresh model. Load the 100-step state for each mode to inspect a common number of sampled poems. Raw loss is per token and cannot rank these modes: each predicts different events, with different vocabulary sizes and parameter counts. A fluent line-mode output can simply recombine intact source lines. The test contains familiar lines in unseen combinations, so it does not test composing a new line.",
    ],
    question:
      "Which model can write a new word, a new line, or only a new ordering of known lines?",
  },
  "token-interface": {
    title: "How the two introductory labs stay independent",
    file: "token-lab.js",
    start: null,
    end: null,
    paragraphs: [
      "Each TokenLab instance scopes its controls to one section and starts its own worker. The haiku selector changes its dataset/tokenization ID, resets only that model, and fetches its own presets. Responses from an older tokenization are ignored. Reset, train, pause, sample and restore messages affect only that worker. receive() updates the page from measured states, while trace() plots and lists their losses. controls() disables conflicting actions during training.",
      "loadPresets() fetches only the relevant saved states. importState() checks that a file belongs to this example, then the engine validates its configuration, dataset, vocabulary, weights and optimizer state before replacing the active model. Invalid data produces a visible error.",
      "token-data-ui.js reads the same datasets and word tokenizer as the engine. It shows every example, the actual token IDs and the full vocabulary. The CSV export includes all examples and correctly quotes multiline poems. Selecting an example changes the inspection view only.",
    ],
    question:
      "Which actions change the model, and which only change what the reader sees?",
  },
  overview: {
    title: "The whole lab, in plain language",
    file: "engine.js",
    start: "export const CONFIG",
    end: "export class Random",
    paragraphs: [
      "The letter and name models start as 2,520 numbers; the haiku modes use 3,420 (characters), 3,432 (words) or 2,088 (whole lines). A number is a parameter: a setting the training process can change. It sees one training example at a time, predicts each next token, measures the error, and adjusts those numbers. A token is a letter in Examples 1 and 3A. Example 2 lets you choose characters, words/line breaks or whole lines. Nothing in the program tells it the spelling rules directly.",
      "One training step is one complete string or poem and one parameter update. One hundred steps is not one hundred passes over all the data. The generated words and loss values are computed, not animated examples.",
      "The engagement lab is a different model: logistic regression. Keeping it small lets us inspect exactly how an input score affects an output. The point is measurement validity, not reproducing every feature of a deployed engagement product.",
      "Use the topic selector to walk through the code. Every topic shows the relevant excerpt from the served source. “Show entire module” reveals the remaining plumbing as well.",
    ],
    question:
      "Which part is learning, and which part is our choice about what the model should learn?",
  },
  data: {
    title: "Choose data and keep an independent test set",
    file: "engine.js",
    start: "export function dataset",
    end: "/** Small causal",
    paragraphs: [
      "For the fictional dataset, dataset() generates two invented spelling families using a fixed random seed. Family -a uses consonants b,d,g,l,m,n,r and vowels a,e; family -o uses k,p,s,t,v,z and vowels i,o,u. Each word has two or three consonant-vowel pairs and a final a or o. These are invented patterns, not real populations.",
      "For the names dataset, dataset() uses the fixed split in datasets.js. Inspect every string and its provenance in the data inspector. For fictional words, a Set rejects duplicates. The generator makes 96 distinct words per family: 80 for training and 16 held out. These sets never overlap. The training-mix slider changes the chance of choosing each family, not its rules or the held-out distribution.",
      "The train() method first draws a set, then a word within that family. A 90:10 mix therefore describes sampling probability, not a guarantee that exactly 90 of the next 100 examples come from set A.",
    ],
    question:
      "If one family becomes rare in training, what would you expect its separate held-out loss to do?",
  },
  datasets: {
    title: "Names, provenance and the choices behind a dataset",
    file: "datasets.js",
    start: null,
    end: null,
    paragraphs: [
      "DATASETS declares sources and limits. STUDY_NAMES contains all 36 first names from Bertrand and Mullainathan (2004), Appendix Table A1. Each study association combines the female and male lists, alphabetized within those original categories. We lowercase them; every third entry is held out. This is our split, not the study's experimental design.",
      "SCENARIOS changes only which dataset and sampling share are used. nameSplit() returns 12 training and 6 test names per set. The exact strings and probabilities are exposed by data-ui.js, including which training names form the fixed probe. The model never receives the historical group label as an input.",
      "These names were selected to elicit perceived race in a specific U.S. study. They are not representative samples or a name-to-identity lookup. Only spelling is learned here, with no resumes, callback outcomes or hiring decisions. Our training results do not replicate the original discrimination experiment.",
      "The alphabet is a–z only. These published spellings fit that restriction, so none are silently transliterated or dropped. Other scripts and accented names cannot be expressed by this model. Balanced sampling inside a restricted list cannot solve missing coverage.",
    ],
    question:
      "Who is absent even when the selected sets receive equal training?",
  },
  fairness: {
    title: "Compare exposure effects without declaring a model fair",
    file: "data-ui.js",
    start: "export function showComparisons",
    end: "/** @returns {void} Export",
    paragraphs: [
      "showComparisons() reads losses measured from three saved 600-step name models. Their starting weights, architecture, optimizer and test names match. Only the sampling probability changes. The table subtracts each set's equal-exposure loss from its own loss in the changed condition. Positive differences mean worse prediction.",
      "Compare a set with itself across runs: a raw A–B gap can also reflect spelling difficulty and the particular held-out split. One seed and six test names per set cannot support population claims. Neither lower average loss nor equal group losses proves fair treatment.",
      "For a real application, specify the harm, inspect coverage and labels, measure relevant errors for affected people, and test changes with their input. The separate engagement lab demonstrates why changing representation alone may leave an invalid target untouched.",
    ],
    question: "Which harm would a spelling-loss comparison fail to detect?",
  },
  random: {
    title: "Reproducibility: randomness with a saved state",
    file: "engine.js",
    start: "export class Random",
    end: "/** Scalar differentiation",
    paragraphs: [
      "Random.next() is a deterministic pseudorandom generator. The same seed and sequence of calls produces the same numbers. normal() transforms two uniform draws into one normal draw for initializing parameters.",
      "Training randomness chooses documents. Sampling uses a separate generator with seed 2026. Generating text or evaluating a checkpoint cannot silently change which word the next training step will see.",
      "Exact repeatability applies within the same implementation and numerical environment; different JavaScript engines can produce tiny floating-point differences. Seeds do not make a single run representative of all runs.",
    ],
    question:
      "Would a change in outputs still be interpretable if the training data and random choices changed at the same time?",
  },
  tokens: {
    title: "Characters become numbers, then vectors",
    file: "engine.js",
    start: "constructor(share",
    end: "/** @param {number[]} x @param {number[][]} w",
    paragraphs: [
      "In the letter/name models, letters a to z map to IDs 0 to 25. ID 26 marks the beginning and end of a word. For example, baba becomes [26, 1, 0, 1, 0, 26]. IDs are labels, not numerical meanings: token 10 is not “twice” token 5.",
      "In the haiku model, the sorted training-word vocabulary and a line-break token replace character IDs. A final ID marks the boundary. Open Example 2’s inspector for all 61 token IDs. Unknown tokens and sequences longer than the configured context are rejected.",
      "matrix() allocates the learnable parameters on the differentiation tape. The embedding table gives each character a vector of 12 learned numbers. The position table (12 positions for letters, 20 for haikus) supplies another vector indicating where that character occurs.",
      "output, query, key, val, project, up and down are additional learned matrices. m and v begin at zero and retain the optimizer’s moving averages. count records how many tape entries are permanent parameters; later entries are temporary calculations.",
    ],
    question:
      "How is a fixed character ID different from the representation the model learns for it?",
  },
  forward: {
    title: "A forward pass makes a prediction",
    file: "engine.js",
    start: "linear(x, w)",
    end: "/** @param {string} word",
    paragraphs: [
      "linear() multiplies an input vector by a learned matrix: each output is a weighted sum. norm() rescales a vector by its root mean square so activation magnitudes stay manageable. softmax() turns any list of scores into probabilities that add to one.",
      "forward() adds the current character and position embeddings. attention() computes a query, key and value. Each of three heads compares the current query with keys from the current and earlier positions, then combines the corresponding values. The cache contains only positions already processed, so no future character is visible.",
      "The attention result is added to the previous representation: a residual connection. A two-layer feed-forward calculation expands 12 values to 48, applies ReLU (negative values become zero), and compresses back to 12. Another residual addition precedes the output projection.",
      "The result is one unnormalized score per possible next token: 27 for letters, 61 for the haiku vocabulary. This is learned computation; there is no list of correct generated words to look up.",
    ],
    question:
      "What prevents the model from seeing the character it is supposed to predict?",
  },
  loss: {
    title: "Loss measures a specific kind of error",
    file: "engine.js",
    start: "loss(word)",
    end: "/** @returns {number} Perform",
    paragraphs: [
      "loss() resets the temporary tape, surrounds the word with boundary tokens, and asks for a next-token prediction at each position. If the observed next character is a, it uses the probability assigned to a.",
      "The loss is minus the natural logarithm of that probability. Probability 0.5 gives loss about 0.693; probability 0.1 gives about 2.303. Assigning little probability to the observed character costs more. All 27 letter tokens equally likely gives loss about 3.296; all 61 haiku tokens equally likely gives about 4.111.",
      "We average across predicted positions within each complete string or poem. Evaluation then averages equally across words. This is a choice about weighting. Loss measures this next-character task; it does not measure truth, fairness, creativity, or usefulness.",
    ],
    question:
      "What important outcome could get worse even while this particular loss falls?",
  },
  tape: {
    title: "Backpropagation: trace how each number affected the error",
    file: "engine.js",
    start: "export class Tape",
    end: "/** @param {string} [id]",
    paragraphs: [
      "Tape is a temporary record of calculations. node() stores a result, up to two input-node indices (a and b), and how a small change in each input would change that result (da and db). The value array stores results; grad stores the accumulated effect on the final loss.",
      "add(), mul(), scale(), shift(), pow(), exp(), log() and relu() each record their local derivative. sum() chains additions. These functions do not choose a training goal; they make differentiation possible for the goal supplied by loss().",
      "backward() begins with a loss gradient of one. It walks the tape in reverse and multiplies local derivatives along each path. Contributions are added because the same parameter can influence many predictions.",
      "For example, if L = a × b + a, with a=2 and b=3, a affects the result along two paths. Its derivative is b+1=4; b’s derivative is a=2. Our tests check this shared-path case and compare a transformer gradient with a numerical perturbation.",
      "The arrays are preallocated and reused. Permanent parameters occupy the first entries; each new word overwrites temporary nodes after them. The explicit capacity check turns oversized computation into an understandable error.",
    ],
    question:
      "Why would replacing gradient accumulation with assignment lose part of a parameter’s influence?",
  },
  learning: {
    title: "Training updates weights using gradients",
    file: "engine.js",
    start: "train() {",
    end: "/** @returns {{train:number",
    paragraphs: [
      "train() samples a document, constructs its loss, and calls backward(). Now every parameter has a gradient: an estimate of how changing that parameter would change this word’s loss locally.",
      "Adam keeps two running summaries per parameter. m tracks recent gradients; v tracks their squares. Bias corrections account for starting both summaries at zero. The update moves against the gradient, scaled by the recent gradient magnitude and a small stabilizing constant.",
      "The learning rate starts near 0.006 and declines on a fixed 1,200-step schedule. It is the size of the adjustment, not a confidence score. One update can improve one example and worsen another; the evaluation trace need not fall at every checkpoint.",
      "Only this method changes weights. Evaluation and generation run forward calculations without applying optimizer updates.",
    ],
    question:
      "Why does one improving training example tell us less than a fixed set of unseen examples?",
  },
  evaluate: {
    title: "Evaluate without teaching to the test",
    file: "engine.js",
    start: "evaluate() {",
    end: "/** @param {number} [temperature]",
    paragraphs: [
      "evaluate() computes loss on the same 16 training-probe words every time, plus all held-out examples: 32 fictional strings, 12 study names, or 16 haiku combinations. It calls loss() but never backward() or the optimizer. The training random state and parameters are unchanged.",
      "The held-out result gives each family equal weight, even when training is skewed. Separate a and b metrics reveal differences in spelling prediction; comparison with the same set in another run helps isolate exposure effects. The chart and exact table show observed values from saved states.",
      "Training loss below held-out loss can suggest overfitting, but these sets are small and differ in difficulty. A held-out value below the training-probe value is also possible. Neither ordering by itself diagnoses a bug or proves generalization.",
      "The engagement experiment audits against two different targets. Agreement with the same proxy that created the labels can conceal failure against the separately generated engagement state.",
    ],
    question:
      "Which evaluation would catch a model that learned the labeling convention perfectly but learned the wrong construct?",
  },
  sample: {
    title: "Generate text without further training",
    file: "engine.js",
    start: "sample(temperature",
    end: "/** @returns {object}",
    paragraphs: [
      "sample() begins with the boundary token, runs the model, divides the logits by temperature, and converts them to sampling weights. A seeded random draw chooses a token. That token becomes part of the context for the next draw.",
      "Generation stops when the boundary token is selected again or at the configured limit (12 letter tokens or 20 haiku tokens). An immediate boundary produces an empty sample. The displayed output includes that possibility instead of hiding it.",
      "Lower temperature concentrates selection on high-scoring tokens; higher temperature spreads selection out. Neither changes the weights or creates a truth check. All displayed samples use the same independent seed to make comparisons easier.",
    ],
    question:
      "If a model repeatedly produces the same mistake at low temperature, what would a temperature change actually repair?",
  },
  checkpoint: {
    title: "A checkpoint is more than a sample of output",
    file: "engine.js",
    start: "snapshot() {",
    end: null,
    paragraphs: [
      "snapshot() saves all learned weights, both Adam summaries, the training step, the training random state, the sampling mix, exact dataset signature and the architecture version. Restoring only weights would not reproduce the same next update because the optimizer and document draw also matter.",
      "restore() builds a fresh candidate and checks the checkpoint format, architecture, dataset, token vocabulary, lengths and numerical values before replacing the active state. Fresh, 100-step and 600-step checkpoints were generated by the same engine and are shipped with this site. They are not hand-entered loss values.",
      "The worker saves session states every 50 steps and when paused. Loading an earlier state discards the later branch of the session history. Download a state to retain it after leaving the page, and use Import checkpoint to resume it.",
    ],
    question:
      "What would be missing from a screenshot of a loss curve if you wanted another person to reproduce the run?",
  },
  worker: {
    title: "Keep the page responsive",
    file: "worker.js",
    start: null,
    end: null,
    paragraphs: [
      "worker.js runs the transformer on a separate browser thread. It processes messages for initialization, training, pausing, resampling, restoring and downloading. trainLoop() performs five updates and yields before continuing so a pause or reset can be handled.",
      "A generation counter cancels an older training loop when the user resets or restores. report() evaluates and captures the actual current state. No result is replaced with a prewritten animation.",
      "lab.js manages buttons, draws loss lines, builds the exact-value table, and renders word samples. It does not calculate gradients. Errors are surfaced to the reader, and conflicting actions are disabled during training.",
    ],
    question:
      "Why should changing a chart or clicking a help button have no effect on the learned parameters?",
  },
  "bias-data": {
    title: "The assumptions behind the bias experiment",
    file: "bias.js",
    start: "export const SCENARIOS",
    end: "/** @param {number[]} weights",
    paragraphs: [
      "observations() creates 200 rows per fictional context, half engaged and half not engaged. This latent state y is stipulated by the simulation; it is not something a camera measured. The training and test sets use independent seeds, 111 and 222.",
      "For engaged A, mean gaze and stillness scores are both 0.78. For engaged B they are 0.27 and 0.38. For not-engaged A they are 0.25 and 0.30; for not-engaged B, 0.33 and 0.43. Each gets normal noise with standard deviation 0.12, then is clipped to 0–1.",
      "The independent task-evidence signal has mean 0.7 when engaged and 0.3 otherwise, with noise standard deviation 0.2, identically in both contexts. This creates overlap and remaining errors even in the better-aligned condition. These values are invented, not empirical estimates.",
      "target() decides what label is taught. Explicit bias flips half of engaged B labels to zero. Proxy bias uses (gaze + stillness)/2 > 0.55. The repair condition uses y. The group is never a predictor; it is used for auditing, weighting and the deliberate label alteration.",
      "The proxy condition gives A 90% of total training weight. The balanced condition changes that to 50% but keeps the same flawed rule. More representative examples of an invalid target do not make the target valid.",
    ],
    question:
      "Where exactly did the program equate a measurement with the construct it wanted to infer?",
  },
  "bias-learning": {
    title: "How the engagement classifier learns",
    file: "bias.js",
    start: "export function predict",
    end: "/** @param {any} model @param {any[]} rows @returns {any}",
    paragraphs: [
      "This is logistic regression, not a transformer. predict() recenters each 0–1 feature to −1–1, multiplies it by a learned weight, adds an intercept, and applies the sigmoid 1/(1+exp(−z)). That score concerns the positive training label.",
      "makeClassifier() starts all weights at zero. fitEpoch() visits all 400 training rows, computes prediction-minus-label for each, and accumulates a weighted gradient. The learning rate 0.5 adjusts the few weights. We repeat 300 epochs; each epoch is a full pass, unlike transformer steps that each sample one complete string or poem.",
      "Explicit bias uses gaze, stillness and task evidence. Both proxy conditions use gaze and stillness only. The measurement-repair condition uses task evidence only. No model receives the context identifier as a feature.",
      "The bias is not hidden inside a complex architecture. It can enter when choosing features, weighting examples, defining labels, or deciding what to count as success.",
    ],
    question:
      "Would removing a group identifier prevent bias if the remaining signals carry the same contextual difference?",
  },
  "bias-audit": {
    title: "Why perfect label agreement can coexist with failure",
    file: "bias.js",
    start: "export function audit",
    end: null,
    paragraphs: [
      "audit() evaluates 400 independently generated test rows with a fixed score threshold of 0.5. It separately counts agreement with the training label and accuracy against the latent state. For a proxy-trained model these are different targets.",
      "A false negative means the model predicts negative for an example whose assumed engagement state is positive. The table reports counts out of 100 engaged examples per context. The expanded audit also reports false positives among the 100 not-engaged examples per context.",
      "bias-ui.js runs the four fits, shows their measured results, and probes two otherwise matched input records. Both have task evidence 0.8; gaze and stillness change from 0.8 to 0.25. A changed score reveals sensitivity to those inputs, not a causal effect on a person.",
      "The final condition has access to the simulation’s answer key and a better-aligned signal by construction. In a real study, that criterion would have to be justified through evidence. We are demonstrating a possible failure mechanism, not estimating its prevalence.",
    ],
    question:
      "What independent criterion would you need before calling a real learner disengaged?",
  },
  interface: {
    title: "What the interface code does",
    file: "lab.js",
    start: null,
    end: null,
    paragraphs: [
      "boot() creates the worker and turns failures into visible messages. send() posts actions; render() updates the page from worker results. setControls() prevents conflicting operations while a run is active.",
      "chart() converts actual losses to SVG coordinates using a shared scale; historyTable() writes exact values and checkpoint choices. presets() downloads the measured bundled states. download() creates a local JSON file. None of these functions trains a model.",
      "The separate bias-ui.js performs the four small classifier fits with brief yields so the interface stays usable. explanations.js contains the teaching text you are reading; explain.js opens the help dialogs and fetches same-site source as text. No dialog changes model state.",
      "data-ui.js shows exact word pools and comparisons; bias-data-ui.js shows every generated engagement row and the rule-specific label, including mismatches with the assumed state. Both offer CSV downloads. simple.js supplies shorter explanations through explain.js. Use the source-module selector to inspect every module in full. Source is shown with line numbers and is inserted as text, never executed from this viewer.",
    ],
    question:
      "Which numbers on the screen are model outputs, and which are settings chosen by the author or reader?",
  },
};
export const HELP = {
  fairness: [
    "What does this fairness check establish?",
    "It compares spelling prediction across training mixes. The same set is evaluated on the same held-out names. It can reveal an exposure effect, but does not measure hiring discrimination or certify equal treatment. Missing groups and misleading labels need separate checks.",
    "fairness",
  ],
  mix: [
    "Training mix",
    "Changes how often the trainer samples each example set. The test set stays 50:50. Apply it with New run; it does not alter an already trained model.",
    "data",
  ],
  steps: [
    "One step, one update",
    "Each step samples one word and updates all parameters once. It is not a full pass over the dataset. The maximum per run is 1,200 steps.",
    "learning",
  ],
  trainLoss: [
    "Training probe loss",
    "Average next-character loss on the same 16 training words, eight from each family. This is a fixed probe, not the last randomly sampled training example. Lower is better for this task.",
    "loss",
  ],
  heldout: [
    "Held-out loss",
    "The model predicts examples excluded from training: 32 fictional words or 12 study names. We measure its loss without changing weights. This checks those examples, not general intelligence or fairness.",
    "evaluate",
  ],
  curve: [
    "Read the trace carefully",
    "Solid teal is training-probe loss; dashed rust is held-out loss. Lower means better next-character prediction. The exact table also separates the families. A fluctuating gap alone does not diagnose overfitting.",
    "evaluate",
  ],
  samples: [
    "Real generated samples",
    "The current model generates these strings character by character. Same seed, fixed weights, selected temperature. Spelling plausibility is not proof of correctness or fairness.",
    "sample",
  ],
  checkpoint: [
    "Resume the actual learning state",
    "Weights, optimizer memory, training step, random state and data mix are saved together. Ready-made states are real runs. Session states vanish when the page closes unless downloaded.",
    "checkpoint",
  ],
  construct: [
    "Concept, signal, label",
    "The construct is what we want to understand. A signal is what we observe. A label is what we teach the model to predict. Calling a gaze signal “engagement” does not establish that the two are equivalent.",
    "bias-data",
  ],
  agreement: [
    "Agreement with which answer key?",
    "Label agreement compares predictions with the labeling rule used for that training condition. If the rule is a biased proxy, a perfect score can mean the model reproduced that bias perfectly.",
    "bias-audit",
  ],
  missed: [
    "Engaged examples missed",
    "False negatives divided by the number of engaged examples in that fictional context. Each test context has 100 engaged examples. The expanded audit also shows false positives.",
    "bias-audit",
  ],
};
