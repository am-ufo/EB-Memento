# Curriculum outlines

One outline per official EB syllabus in [../eb-curriculumn](../eb-curriculumn): year, topic (strand), subtopic, and the content items under it. This is the scaffold for filling [src/data/formulas.json](../../src/data/formulas.json) — tick an item once the formulas it carries are in the catalog.

Reference docs only. They are deliberately not in `src/data/`, so nothing here ships in the offline bundle.

## Files

| Outline | Source PDF | Ref | Years | Course tags |
| --- | --- | --- | --- | --- |
| [s4-s5-maths-6p.md](s4-s5-maths-6p.md) | `s4-s5 6p Maths.pdf` | 2019-01-D-49-en-4 | S4, S5 | `S4-Maths-6P`, `S5-Maths-6P` |
| [s6-s7-maths-5p.md](s6-s7-maths-5p.md) | `s6-s7 5p Maths.pdf` | 2021-01-D-53-en-3 | S6, S7 | `S6-Maths-5P`, `S7-Maths-5P` |
| [s6-s7-maths-3p-advanced.md](s6-s7-maths-3p-advanced.md) | `s6-s7 3p Maths Advanced.pdf` | 2021-01-D-54-en-3 | S6, S7 | `S6-Maths-3P-Adv`, `S7-Maths-3P-Adv` |
| [s4-s5-physics.md](s4-s5-physics.md) | `s4-s5 Physics.pdf` | 2019-01-D-50-en-2 | S4, S5 | `S4-Physics`, `S5-Physics` |
| [s6-s7-physics.md](s6-s7-physics.md) | `s6-s7 Physics.pdf` | 2021-01-D-56-en-3 | S6, S7 | `S6-Physics`, `S7-Physics` |

Fill order follows the product ladder in [docs/EB-Memento-Plan-v7.md](../EB-Memento-Plan-v7.md): S5 Maths 6P first, then S6-S7 Maths 5P, then Physics, then Advanced.

## Course tags

The vocabulary for `courses[]` on every formula. Only `S5-Maths-6P` is in use today.

- Maths 6P: `S4-Maths-6P`, `S5-Maths-6P`
- Maths 5P: `S6-Maths-5P`, `S7-Maths-5P`
- Advanced maths (3P complementary, labelled `AM` in the syllabus tables): `S6-Maths-3P-Adv`, `S7-Maths-3P-Adv`
- Physics: `S4-Physics`, `S5-Physics`, `S6-Physics`, `S7-Physics`

A course tag is one year of one programme, because a formula enters the syllabus in a specific year. The 4P and 2P cohorts get no tags of their own: 6P covers 4P and Physics 4P covers 2P, per the plan.

## Outline format

```markdown
## Year S5 (6P)

### Geometry

#### Measure of angles

- [ ] Degrees
- [ ] Radians (formula)

#### Unit circle

- [ ] Trigonometric formulae (formula)
  - Pythagorean identity
  - cosine rule
```

- `##` year, `###` topic as named in the syllabus `TOPIC:` table headers, `####` subtopic from the Subtopic column.
- Each `- [ ]` is one item from the Content column. Unchecked means no formula card for it yet; checked means the catalog covers it.
- `(formula)` marks items where the syllabus itself states a formula, so it is clear which rows can yield a card at all. Plenty of items are method or interpretation work and will never produce one.
- Nested plain bullets name the individual formulas where one content item holds several — a card each, not one. Names only; the expressions themselves belong in `formulas.json`.

## Where the catalog stands against these outlines

`src/data/formulas.json` now has a card for every outline item marked `(formula)` (and a card each for nested formula names). Course tags follow the vocabulary above. Sample-row mismatches (wrong year tag, invented `Trigonometry` / `Sequences` / `Calculus` topics) are fixed.

Unchecked items are method or interpretation work and were never meant to become cards.

## Fidelity

Labels only. Topic, subtopic and content names come across as the short phrases they are in the syllabus; the Learning objectives and Key contexts columns are left out entirely. No paraphrased objectives, no invented subtopics — `AGENTS.md` forbids transcribing the PDFs, and formulas must stay syllabus-exact.
