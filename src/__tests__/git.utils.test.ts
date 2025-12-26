import { extractTicketFromBranch } from "../utils/git.utils";
import { branchTestCases } from "./__mocks__/gitData";
import { t } from "../utils/i18n.utils";

jest.mock("vscode");
jest.mock("../utils/i18n.utils");

describe("git.utils", () => {
  beforeEach(() => {
    (t as jest.Mock).mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        "git.noWorkspace": "No workspace",
        "git.noBranch": "No branch",
        "git.notGit": "Not Git",
      };
      return translations[key] || key;
    });
  });

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
