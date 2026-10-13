/** Preserve the migrated LLM101 pedagogy content and behavior. */
const pedagogy = [
  {
    principle: "Depth-Adjustable Views",
    claim: "Learners should be able to move between simplified and detailed explanations based on their current understanding.",
    rationale: "Vygotsky's Zone of Proximal Development holds that learning is most effective when material is pitched just beyond what a learner can do unaided, with support bridging the gap. Wood et al. formalised this as scaffolding: temporary instructional support that is gradually withdrawn as competence grows. Offering depth toggles lets each learner self-select into their ZPD rather than being stuck at one fixed level.",
    sources: [
      {
        authors: "Wood, D., Bruner, J. S., & Ross, G.",
        year: 1976,
        title: "The role of tutoring in problem solving",
        venue: "Journal of Child Psychology and Psychiatry, 17(2), 89–100",
        link: "https://doi.org/10.1111/j.1469-7610.1976.tb00381.x"
      },
      {
        authors: "Vygotsky, L. S.",
        year: 1978,
        title: "Mind in Society: The Development of Higher Psychological Processes",
        venue: "Harvard University Press",
        link: "https://www.hup.harvard.edu/catalog.php?isbn=9780674576292"
      }
    ]
  },
  {
    principle: "Concrete-Before-Formal Ordering",
    claim: "Concepts should be introduced through tangible examples and analogies before formal definitions or mathematical notation.",
    rationale: "Bruner's spiral curriculum argues that any idea can be taught in an intellectually honest way at any stage, provided it is first grounded in enactive or iconic representation before moving to symbolic form. Beginning with a concrete story or worked example gives learners a mental peg on which to hang the abstraction that follows. Revisiting the same concept at increasing levels of formality lets understanding deepen naturally over time.",
    sources: [
      {
        authors: "Bruner, J. S.",
        year: 1960,
        title: "The Process of Education",
        venue: "Harvard University Press",
        link: "https://www.hup.harvard.edu/catalog.php?isbn=9780674710016"
      },
      {
        authors: "Bruner, J. S.",
        year: 1966,
        title: "Toward a Theory of Instruction",
        venue: "Harvard University Press",
        link: "https://www.hup.harvard.edu/catalog.php?isbn=9780674897014"
      }
    ]
  },
  {
    principle: "Glossary Popovers Over Inline Definitions",
    claim: "Technical terms should reveal their definitions on demand via popovers rather than being defined inline in the running text.",
    rationale: "Sweller's Cognitive Load Theory distinguishes intrinsic load (the inherent complexity of the material) from extraneous load (effort caused by poor presentation). Embedding full definitions mid-sentence forces readers to parse two streams of information simultaneously, inflating extraneous load. A popover keeps the narrative flow intact while still making the definition immediately reachable, directing cognitive resources toward the core ideas.",
    sources: [
      {
        authors: "Sweller, J.",
        year: 1988,
        title: "Cognitive load during problem solving: Effects on learning",
        venue: "Cognitive Science, 12(2), 257–285",
        link: "https://doi.org/10.1207/s15516709cog1202_4"
      },
      {
        authors: "Sweller, J., van Merriënboer, J. J. G., & Paas, F.",
        year: 1998,
        title: "Cognitive architecture and instructional design",
        venue: "Educational Psychology Review, 10(3), 251–296",
        link: "https://doi.org/10.1023/A:1022193728205"
      }
    ]
  },
  {
    principle: "Check Questions for Retrieval Practice",
    claim: "Short self-test questions embedded throughout the content strengthen long-term retention more than re-reading alone.",
    rationale: "Roediger and Karpicke demonstrated in controlled experiments that retrieving information from memory produces substantially greater retention than spending the same time studying, an effect now called the testing effect. Even a single low-stakes question after a section measurably improves recall a week later. Embedding check questions at the end of each concept section therefore leverages retrieval practice without requiring a separate quiz environment.",
    sources: [
      {
        authors: "Roediger, H. L., & Karpicke, J. D.",
        year: 2006,
        title: "Test-enhanced learning: Taking memory tests improves long-term retention",
        venue: "Psychological Science, 17(3), 249–255",
        link: "https://doi.org/10.1111/j.1467-9280.2006.01693.x"
      },
      {
        authors: "Karpicke, J. D., & Roediger, H. L.",
        year: 2008,
        title: "The critical importance of retrieval for learning",
        venue: "Science, 319(5865), 966–968",
        link: "https://doi.org/10.1126/science.1152408"
      }
    ]
  },
  {
    principle: "Separating Mechanism from Meaning",
    claim: "How a system works and why it matters should be taught in distinct arcs rather than interleaved.",
    rationale: "Working memory can hold only a handful of novel elements simultaneously; asking learners to simultaneously track computational mechanics and conceptual implications quickly overwhelms this capacity. A dual-arc structure presents the mechanism first as a self-contained story, then revisits the same material to draw out its broader significance. This sequencing lets each arc occupy working memory on its own terms, reducing the risk of neither being understood well.",
    sources: [
      {
        authors: "Baddeley, A. D., & Hitch, G.",
        year: 1974,
        title: "Working memory",
        venue: "Psychology of Learning and Motivation, 8, 47–89",
        link: "https://doi.org/10.1016/S0079-7421(08)60452-1"
      },
      {
        authors: "Miller, G. A.",
        year: 1956,
        title: "The magical number seven, plus or minus two: Some limits on our capacity for processing information",
        venue: "Psychological Review, 63(2), 81–97",
        link: "https://doi.org/10.1037/h0043158"
      }
    ]
  },
  {
    principle: "Fading Scaffolds",
    claim: "Instructional support should begin with fully worked examples and gradually shift responsibility for problem solving to the learner.",
    rationale: "Hmelo-Silver and colleagues showed that highly scaffolded worked examples are more efficient for novices than open-ended problem solving, because they free cognitive resources for learning the underlying structure. As expertise develops, the same worked examples can have steps progressively removed — a technique called the completion problem or fading procedure — until the learner solves problems independently. This trajectory respects the expertise reversal effect: scaffolds that help novices can actually hinder more advanced learners.",
    sources: [
      {
        authors: "Hmelo-Silver, C. E., Duncan, R. G., & Chinn, C. A.",
        year: 2007,
        title: "Scaffolding and achievement in problem-based and inquiry learning: A response to Kirschner, Sweller, and Clark",
        venue: "Educational Psychologist, 42(2), 99–107",
        link: "https://doi.org/10.1080/00461520701263368"
      },
      {
        authors: "van Merriënboer, J. J. G., & Sweller, J.",
        year: 2005,
        title: "Cognitive load theory and complex learning: Recent developments and future directions",
        venue: "Educational Psychology Review, 17(2), 147–177",
        link: "https://doi.org/10.1007/s10648-005-3951-0"
      }
    ]
  },
  {
    principle: "Plain-Language Hook Before Technical Content",
    claim: "A brief, jargon-free narrative overview should precede each section of technical exposition.",
    rationale: "Ausubel's advance organizer theory proposes that presenting a high-level conceptual framework before detailed material gives learners cognitive anchors to which new information can be attached. Without such anchors, technical details arrive without a home in memory and are quickly forgotten. A two-to-three sentence plain-language hook functions as a minimal advance organizer, establishing purpose and context before the learner must process formal content.",
    sources: [
      {
        authors: "Ausubel, D. P.",
        year: 1960,
        title: "The use of advance organizers in the learning and retention of meaningful verbal material",
        venue: "Journal of Educational Psychology, 51(5), 267–272",
        link: "https://doi.org/10.1037/h0046669"
      },
      {
        authors: "Mayer, R. E.",
        year: 1979,
        title: "Twenty years of research on advance organizers: Assimilation theory is still the best predictor of results",
        venue: "Instructional Science, 8(2), 133–167",
        link: "https://doi.org/10.1007/BF00117008"
      }
    ]
  }
];

export default pedagogy;
