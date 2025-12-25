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
  });
});
