import { extractTicketFromBranch } from "../utils/git.utils";

jest.mock("vscode");

describe("git.utils", () => {
  describe("extractTicketFromBranch", () => {
    it("should extract an EDI ticket", () => {
      const branch = "feat/EDI-123_ma-feature";
      const prefixes = ["EDI", "GDD"];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBe("EDI-123");
    });

    it("should extract a GDD ticket", () => {
      const branch = "feat/GDD-750_ma-super-feature";
      const prefixes = ["EDI", "GDD"];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBe("GDD-750");
    });

    it("should be case insensitive", () => {
      const branch = "feat/edi-456_test";
      const prefixes = ["EDI", "GDD"];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBe("EDI-456");
    });

    it("should return null if no prefix is found", () => {
      const branch = "feat/autre-123_test";
      const prefixes = ["EDI", "GDD"];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBeNull();
    });

    it("should return null if branch does not contain a ticket", () => {
      const branch = "main";
      const prefixes = ["EDI", "GDD"];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBeNull();
    });

    it("should return branch name when no prefixes are configured", () => {
      const branch = "feat/my-feature-branch";
      const prefixes: string[] = [];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBe("feat/my-feature-branch");
    });

    it("should return branch name even for simple branch names when no prefixes", () => {
      const branch = "main";
      const prefixes: string[] = [];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBe("main");
    });

    it("should return branch name for any branch when no prefixes", () => {
      const branch = "develop";
      const prefixes: string[] = [];
      const result = extractTicketFromBranch(branch, prefixes);
      expect(result).toBe("develop");
    });
  });
});
