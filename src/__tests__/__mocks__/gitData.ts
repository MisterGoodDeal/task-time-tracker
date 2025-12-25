export interface BranchTestData {
  branch: string;
  prefixes: string[];
  expectedResult: string | null;
}

export const branchTestCases: BranchTestData[] = [
  {
    branch: "feat/EDI-123_ma-feature",
    prefixes: ["EDI", "GDD"],
    expectedResult: "EDI-123",
  },
  {
    branch: "feat/GDD-750_ma-super-feature",
    prefixes: ["EDI", "GDD"],
    expectedResult: "GDD-750",
  },
  {
    branch: "feat/edi-456_test",
    prefixes: ["EDI", "GDD"],
    expectedResult: "EDI-456",
  },
  {
    branch: "feat/autre-123_test",
    prefixes: ["EDI", "GDD"],
    expectedResult: null,
  },
  {
    branch: "main",
    prefixes: ["EDI", "GDD"],
    expectedResult: null,
  },
  {
    branch: "feat/my-feature-branch",
    prefixes: [],
    expectedResult: "feat/my-feature-branch",
  },
  {
    branch: "main",
    prefixes: [],
    expectedResult: "main",
  },
  {
    branch: "develop",
    prefixes: [],
    expectedResult: "develop",
  },
];

export const commonPrefixes = ["EDI", "GDD"];

export const emptyPrefixes: string[] = [];

