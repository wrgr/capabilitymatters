/** Plain-language explanations map every computational stage to the source actually running in the browser. */
export const GUIDE = {
  overview: {
    title: "The whole lab, in plain language",
    file: "engine.js",
    start: "export const CONFIG",
    end: "export class Random",
    paragraphs: [
      "The word model starts as 2,520 numbers. A number is a parameter: a setting the training process can change. It sees one fictional word at a time, predicts its next character, measures the error, and adjusts those numbers. Nothing in the program tells it the spelling rules directly.",
      "One training step is one word and one parameter update. One hundred steps is not one hundred passes over all the data. The generated words and loss values are computed, not animated examples.",
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
      "dataset() generates two invented spelling families using a fixed random seed. Family -a uses consonants b,d,g,l,m,n,r and vowels a,e; family -o uses k,p,s,t,v,z and vowels i,o,u. Each word has two or three consonant-vowel pairs and a final a or o. These are invented patterns, not real populations.",
      "A Set rejects duplicate words. The generator makes 96 distinct words per family: 80 for training and 16 held out. These sets never overlap. The training-mix slider changes the chance of choosing each family, not its rules or the held-out distribution.",
      "The train() method first draws a family, then a word within that family. A 90:10 mix therefore describes sampling probability, not a guarantee that exactly 90 of the next 100 examples come from -a.",
    ],
    question:
      "If one family becomes rare in training, what would you expect its separate held-out loss to do?",
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
      "Letters a to z map to IDs 0 to 25. ID 26 marks the beginning and end of a word. For example, baba becomes [26, 1, 0, 1, 0, 26]. IDs are labels, not numerical meanings: token 10 is not “twice” token 5.",
      "matrix() allocates the learnable parameters on the differentiation tape. The embedding table gives each character a vector of 12 learned numbers. The position table supplies another vector indicating where that character occurs.",
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
      "The result is 27 logits, one unnormalized score per possible next token. This is learned computation; there is no list of correct generated words to look up.",
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
      "The loss is minus the natural logarithm of that probability. Probability 0.5 gives loss about 0.693; probability 0.1 gives about 2.303. Assigning little probability to the observed character costs more. All 27 tokens equally likely gives loss about 3.296.",
      "We average across predicted positions within a word. Evaluation then averages equally across words. This is a choice about weighting. Loss measures this next-character task; it does not measure truth, fairness, creativity, or usefulness.",
    ],
    question:
      "What important outcome could get worse even while this particular loss falls?",
  },
  tape: {
    title: "Backpropagation: trace how each number affected the error",
    file: "engine.js",
    start: "export class Tape",
    end: "/** @returns {{train",
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
    end: "/** @returns {{train",
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
      "evaluate() computes loss on the same 16 training-probe words every time, plus all 32 held-out words. It calls loss() but never backward() or the optimizer. The training random state and parameters are unchanged.",
      "The held-out result gives each family equal weight, even when training is skewed. Separate a and b metrics reveal whether one family is being underserved. The chart and exact table show observed values from saved states.",
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
      "sample() begins with the boundary token, runs the model, divides the 27 logits by temperature, and converts them to sampling weights. A seeded random draw chooses a token. That character becomes part of the context for the next draw.",
      "Generation stops when the boundary token is selected again or after 12 characters. An immediate boundary produces an empty sample. The displayed output includes that possibility instead of hiding it.",
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
      "snapshot() saves all learned weights, both Adam summaries, the training step, the training random state, the sampling mix and the architecture version. Restoring only weights would not reproduce the same next update because the optimizer and document draw also matter.",
      "restore() checks the checkpoint format, architecture, lengths and numerical values before loading it. Fresh, 100-step and 600-step checkpoints were generated by the same engine and are shipped with this site. They are not hand-entered loss values.",
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
      "makeClassifier() starts all weights at zero. fitEpoch() visits all 400 training rows, computes prediction-minus-label for each, and accumulates a weighted gradient. The learning rate 0.5 adjusts the few weights. We repeat 300 epochs; each epoch is a full pass, unlike one-word transformer steps.",
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
      "Use the source-module selector to inspect every module in full. Source is shown with line numbers and is inserted as text, never executed from this viewer.",
    ],
    question:
      "Which numbers on the screen are model outputs, and which are settings chosen by the author or reader?",
  },
};
export const HELP = {
  mix: [
    "Training mix",
    "Changes how often the trainer samples each fictional word family. The test set stays 50:50. Apply it with New run; it does not alter an already trained model.",
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
    "The model predicts 32 words excluded from training. We measure its loss without changing weights. This checks new examples from the same invented rules, not general intelligence.",
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
