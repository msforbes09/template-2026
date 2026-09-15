// The judging configuration for the eGov Hackathon 2026, transcribed from the
// "Criteria Setup" tab of the official scoring workbook
// (Final copy of eGovPH_Hackathon_Dynamic_Scoring_Tool.xlsx).
//
// Static by design: this is a published rulebook, not application data, so it
// ships with the frontend rather than coming from an API. If the workbook
// changes, this file changes with it — the criteria-total test below is what
// catches a transcription slip, mirroring the workbook's own "Weight Check".

export type Criterion = {
  name: string;
  // Percentage of the final score. All six sum to 100.
  weight: number;
  // The lowest raw mark (out of MAX_RAW_SCORE) an entry must reach on this
  // criterion. Higher on the two mandatory ones, which are gates rather than
  // preferences.
  minimumRawScore: number;
  mandatory: boolean;
  description: string;
  // Written for judges rather than entrants, and shown as such: it says how to
  // assess the criterion, not what to build.
  judgeGuide: string;
};

export const CRITERIA: Criterion[] = [
  {
    name: "eGov API Integration & Technical Implementation",
    weight: 30,
    minimumRawScore: 3.5,
    mandatory: true,
    description:
      "Actual working integration with eGov APIs; authentication, requests/responses, data exchange, security, error handling, and meaningful use.",
    judgeGuide:
      "Verify actual API interaction and that integration is part of the system workflow.",
  },
  {
    name: "Live System Demonstration & Functionality",
    weight: 25,
    minimumRawScore: 3,
    mandatory: true,
    description:
      "Actual working system demonstrated live, including an end-to-end workflow using the integrated eGov API.",
    judgeGuide: "Do not rely only on slides, screenshots, mockups, or recorded demos.",
  },
  {
    name: "Citizen & Government Impact",
    weight: 15,
    minimumRawScore: 1,
    mandatory: false,
    description:
      "Potential benefit to citizens and government through accessibility, convenience, efficiency, transparency, or improved service delivery.",
    judgeGuide: "Assess scale and practical value of the impact.",
  },
  {
    name: "Government Problem & Solution Relevance",
    weight: 10,
    minimumRawScore: 1,
    mandatory: false,
    description:
      "Addresses a real existing government digital-service problem with a practical and relevant solution.",
    judgeGuide: "Check whether the problem is real, specific, and meaningfully solved.",
  },
  {
    name: "System Development & Technical Quality",
    weight: 15,
    minimumRawScore: 1,
    mandatory: false,
    description:
      "Architecture, tech stack, code structure, database/data handling, security considerations, development approach, and technical understanding.",
    judgeGuide:
      "Team should explain how they built it and why technical choices were made.",
  },
  {
    name: "Scalability & Government Adoption Potential",
    weight: 5,
    minimumRawScore: 1,
    mandatory: false,
    description:
      "Feasibility for deployment, maintenance, expansion, and adoption by agencies or LGUs.",
    judgeGuide: "Consider maintainability, interoperability, and practical deployment.",
  },
];

// From the workbook's "Global Configuration" block.
export const MAX_RAW_SCORE = 10;
export const MINIMUM_TOTAL_SCORE = 70;
export const REQUIRE_VERIFIED_API_INTEGRATION = true;
export const REQUIRE_LIVE_DEMONSTRATION = true;

export function totalWeight(criteria: Criterion[] = CRITERIA): number {
  return criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
}

export function mandatoryCriteria(criteria: Criterion[] = CRITERIA): Criterion[] {
  return criteria.filter((criterion) => criterion.mandatory);
}
