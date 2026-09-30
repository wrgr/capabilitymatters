/** Offer short, concrete explanations for every teaching topic without requiring technical vocabulary. */
export const SIMPLE = {
  overview: [
    "What is happening here?",
    "The model practices completing words, one letter at a time. After each example, the code changes its settings so it is more likely to predict those letters next time.",
    "If you show one kind of spelling much more often, the model gets more practice with it. Use the separate test examples to check what that practice helped it learn.",
  ],
  data: [
    "The examples shape the practice",
    "Imagine two piles of word cards. At 90:10, the code chooses the first pile about nine times as often. It then picks a card at random from that pile. Cards can be picked again.",
    "The inspector shows every card. Test cards stay outside both practice piles. Changing the mix does not change which test cards we use.",
  ],
  datasets: [
    "Why these examples?",
    "The invented words let us test a simple idea: does getting less practice change the result? The names let us ask the same question using a small, published list.",
    "The name groups describe stereotypes used in one historical study. They do not tell us who a person is. The list also leaves many people and writing systems out.",
  ],
  fairness: [
    "A better average can hide a worse result for some",
    "Suppose a spelling tool works well for familiar names and poorly for names it rarely encountered. Its average score could look good while some people keep having to correct it.",
    "Compare each set with itself across training mixes. That helps separate the effect of practice from differences between the spellings. A small gap is not a promise of fairness: we still need to ask who is missing and what happens when the tool makes a mistake.",
  ],
  random: [
    "Why do the same steps give the same result?",
    "The code uses a repeatable sequence of draws, like a shuffled deck that starts in the same order each time. The starting number is called a seed.",
    "This helps us compare changes. Trying one deck order does not tell us what would happen with every possible order.",
  ],
  tokens: [
    "How can numbers stand for letters?",
    "The code gives every letter a number, like a seat number. It also keeps a small list of adjustable values for that letter and for its position in the word.",
    "Training changes those values. The letter's identifying number stays the same.",
  ],
  forward: [
    "How does it guess the next letter?",
    "The code combines the letters already seen with the model's current settings. It gives every possible next letter a score.",
    "It can use earlier letters in the word, but it cannot look ahead at the answer. At first its settings are random; practice changes them.",
  ],
  loss: [
    "What does the error score mean?",
    "For each answer letter, the code checks how much chance the model gave that letter. Giving the answer a very small chance produces a large error score.",
    "A lower score means better prediction on these examples. It does not mean the model is truthful, useful or fair.",
  ],
  tape: [
    "How does the code know which settings to change?",
    "It records the calculations that produced a prediction. Then it works backward through that record to calculate how each setting affected the error.",
    "Those calculations guide the next small change. There is no person adjusting each setting by hand.",
  ],
  learning: [
    "What happens during one training step?",
    "Pick one practice word. Predict its letters. Measure the errors. Adjust the settings a little. That is one step.",
    "The update also uses a record of earlier changes to help control its size. One hundred steps means one hundred sampled words, with possible repeats.",
  ],
  evaluate: [
    "How do we check whether practice helped?",
    "Ask the model to predict letters in words it was not allowed to practice on. Record the error without changing any settings.",
    "We report each set separately, as well as an average. A tiny test can reveal a problem, but cannot prove the model will work for everyone.",
  ],
  sample: [
    "How are the new words made?",
    "The model gives possible next letters different chances. The code draws a letter, adds it to the word, and repeats.",
    "Temperature changes how strongly the draw favors the higher-scoring letters. It does not teach the model anything new. A generated string may be an existing name, an invented name or nonsense.",
  ],
  checkpoint: [
    "What does saving a checkpoint save?",
    "It saves the model's settings and the information needed to continue practicing from that point. That includes which examples and training mix it uses.",
    "Loading it is like opening a saved game. A screenshot only shows the result; a checkpoint lets you continue.",
  ],
  worker: [
    "Why does the page still respond while it trains?",
    "The browser does the training in a separate work area. The page receives updates and shows the results.",
    "The training pauses between small batches so the browser can handle your next instruction.",
  ],
  "bias-data": [
    "What if the answer key is wrong?",
    "Imagine calling a learner engaged only when they look toward the camera. Someone could be concentrating while looking elsewhere.",
    "If we teach a model using that rule, it can get very good at predicting the rule without measuring engagement well. This lab invents observations to make that difference visible.",
  ],
  "bias-learning": [
    "What is the engagement model learning?",
    "This smaller model combines a few input scores to predict a label. Training changes how much each input matters.",
    "The training goal comes from us. If we reward matching a misleading label, successful training can repeat the same mistake.",
  ],
  "bias-audit": [
    "Whose mistakes are hidden by the overall score?",
    "We count how often each fictional context gets an incorrect result. We also check whether the model matches the training labels or the separate engagement state we built into this simulation.",
    "Balancing the examples cannot fix a bad definition of engagement. A real tool would need evidence that its measurements work for the people using it.",
  ],
  interface: [
    "What do the buttons and charts do?",
    "The buttons send instructions to the training code. The charts show numbers measured from the model. The inspector shows its exact examples.",
    "Opening an explanation changes only what you see. It does not train or change the model.",
  ],
};
