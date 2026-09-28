/*
  Sample cases for the LLM test gate demo.

  All made up by hand: the policy clauses, the claims, and both sets of
  "model" answers. Nothing here is real model output or a real claim. The
  answers are written to show the failures the post describes — a stray line
  before the JSON, a value outside the allowed list, a real clause that is the
  wrong one, and a claim the evidence does not back.

  Prompt v1 is the version in production. Prompt v2 is a shorter prompt that
  someone wants to ship. The judge labels are what a separate judge model
  would be asked to return: a label and one sentence, never a score.
*/

export const DECISIONS = ['approve', 'reject', 'escalate'];

export const POLICY = [
  ['3.1', 'Room rent: up to 1% of the sum insured per day.'],
  ['3.2', 'Hospital stay must be at least 24 hours.'],
  ['3.6', 'Day-care procedures are covered, up to ₹40,000.'],
  ['3.8', 'Road ambulance: up to ₹2,000 per claim.'],
  ['4.2', 'Pre-existing diseases: 2-year waiting period.'],
  ['5.4', 'Cosmetic treatment is not covered.'],
];

const json = (decision, clause, reason) => JSON.stringify({ decision, clause, reason }, null, 2);

export const CASES = [
  {
    id: 'room-rent',
    name: 'Room rent within the limit',
    input: 'Sum insured ₹5,00,000. Room rent ₹4,000 a day for 3 days.',
    critical: false,
    must: ['3.1'],
    never: ['4.2', '5.4'],
    last: json('approve', '3.1', 'Room rent is ₹4,000 a day, under the ₹5,000 daily limit in clause 3.1.'),
    v1: {
      out: json('approve', '3.1', 'Room rent of ₹4,000 a day is within the 1% of sum insured (₹5,000) allowed by clause 3.1.'),
      judge: ['SUPPORTED', 'The limit and the amount both match the evidence.'],
    },
    v2: {
      out: json('approve', '3.1', 'Room rent is within the clause 3.1 limit.'),
      judge: ['SUPPORTED', 'Short, but correct and backed by the evidence.'],
    },
  },
  {
    id: 'cosmetic',
    name: 'Cosmetic surgery',
    input: 'Rhinoplasty, marked cosmetic by the treating doctor. Bill ₹1,20,000.',
    critical: true,
    must: ['5.4'],
    never: ['4.2', '3.1'],
    last: json('reject', '5.4', 'Cosmetic treatment is excluded by clause 5.4.'),
    v1: {
      out: json('reject', '5.4', 'The doctor marks the procedure as cosmetic, which clause 5.4 excludes.'),
      judge: ['SUPPORTED', 'Right clause, and the reason matches the doctor’s note.'],
    },
    v2: {
      out: json('reject', '4.2', 'Rejected under the waiting period in clause 4.2.'),
      judge: ['UNSUPPORTED', 'Clause 4.2 is a real clause, but nothing in the claim is about a waiting period.'],
    },
  },
  {
    id: 'pre-existing',
    name: 'Pre-existing disease in year one',
    input: 'Policy started 7 months ago. Diabetes declared at purchase. Claim for diabetes treatment.',
    critical: true,
    must: ['4.2'],
    never: ['5.4'],
    last: json('reject', '4.2', 'Diabetes was pre-existing and the 2-year waiting period in clause 4.2 has not passed.'),
    v1: {
      out: json('reject', '4.2', 'Diabetes was declared as pre-existing; clause 4.2 needs 2 years and the policy is 7 months old.'),
      judge: ['SUPPORTED', 'Dates and the declaration both support the rejection.'],
    },
    v2: {
      out: json('reject', '4.2', 'Pre-existing condition inside the 2-year waiting period (clause 4.2).'),
      judge: ['SUPPORTED', 'Correct, and backed by the policy start date.'],
    },
  },
  {
    id: 'bill-mismatch',
    name: 'Bill total does not match the items',
    input: 'Bill total ₹12,500. Line items add up to ₹11,900.',
    critical: false,
    must: ['12,500', '11,900'],
    never: [],
    last: json('escalate', '-', 'The bill total of ₹12,500 does not match the items, which add up to ₹11,900.'),
    v1: {
      out: json('escalate', '-', 'Bill says ₹12,500 but the items add up to ₹11,900. A person should check the difference.'),
      judge: ['SUPPORTED', 'Both amounts match the bill.'],
    },
    v2: {
      out: `Here is the JSON:\n${json('escalate', '-', 'Total ₹12,500 does not match items ₹11,900.')}`,
      judge: ['SUPPORTED', 'The content is right.'],
    },
  },
  {
    id: 'missing-doc',
    name: 'Missing discharge summary',
    input: 'Hospital bill and prescription attached. No discharge summary.',
    critical: false,
    must: ['discharge summary'],
    never: [],
    last: json('escalate', '-', 'The discharge summary is missing; ask the hospital for it.'),
    v1: {
      out: json('escalate', '-', 'No discharge summary was attached. Ask the hospital for it before deciding.'),
      judge: ['SUPPORTED', 'Names the missing document.'],
    },
    v2: {
      out: json('escalate', '-', 'Discharge summary missing — request it from the hospital.'),
      judge: ['SUPPORTED', 'Names the missing document.'],
    },
  },
  {
    id: 'day-care',
    name: 'Cataract surgery (day-care)',
    input: 'Cataract surgery, discharged the same day. Bill ₹55,000.',
    critical: false,
    must: ['3.6'],
    never: ['3.2'],
    last: json('approve', '3.6', 'Cataract is a day-care procedure under clause 3.6; pay up to the ₹40,000 limit.'),
    v1: {
      out: json('approve', '3.6', 'Cataract is a day-care procedure, so it is covered under clause 3.6.'),
      judge: ['UNSUPPORTED', 'The bill is ₹55,000 but clause 3.6 caps it at ₹40,000; the answer implies full payment.'],
    },
    v2: {
      out: json('approve', '3.6', 'Covered as day-care under clause 3.6, up to ₹40,000 of the ₹55,000 bill.'),
      judge: ['SUPPORTED', 'Applies the ₹40,000 limit correctly.'],
    },
  },
  {
    id: 'short-stay',
    name: 'Hospital stay under 24 hours',
    input: 'Admitted for observation, discharged after 14 hours. Not a day-care procedure.',
    critical: false,
    must: ['3.2'],
    never: ['3.6'],
    last: json('reject', '3.2', 'The stay was 14 hours; clause 3.2 needs at least 24.'),
    v1: {
      out: json('reject', '3.2', 'Stay of 14 hours is below the 24 hours clause 3.2 requires.'),
      judge: ['SUPPORTED', 'Matches the admission and discharge times.'],
    },
    v2: {
      out: json('denied', '3.2', 'Stay shorter than 24 hours (clause 3.2).'),
      judge: ['SUPPORTED', 'The reasoning is right.'],
    },
  },
  {
    id: 'ambulance',
    name: 'Ambulance charges',
    input: 'Road ambulance, ₹1,800.',
    critical: false,
    must: ['3.8'],
    never: ['no limit'],
    last: json('approve', '3.8', 'Road ambulance of ₹1,800 is within the ₹2,000 limit in clause 3.8.'),
    v1: {
      out: json('approve', '3.8', 'Ambulance cost of ₹1,800 is under the ₹2,000 limit in clause 3.8.'),
      judge: ['SUPPORTED', 'Amount and limit both correct.'],
    },
    v2: {
      out: json('approve', '3.8', 'Ambulance charges are covered with no limit under clause 3.8.'),
      judge: ['UNSUPPORTED', 'Clause 3.8 has a ₹2,000 limit; “no limit” is made up.'],
    },
  },
];
