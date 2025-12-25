import { extractTicketFromBranch } from "../utils/git.utils";
import { branchTestCases } from "./__mocks__/gitData";

jest.mock("vscode");

describe("git.utils", () => {
  describe("extractTicketFromBranch", () => {
    it.each(branchTestCases)(
      "should handle branch: $branch with prefixes: $prefixes",
      ({ branch, prefixes, expectedResult }) => {
        const result = extractTicketFromBranch(branch, prefixes);
        expect(result).toBe(expectedResult);
      }
    );
  });
});
