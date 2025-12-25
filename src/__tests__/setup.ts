import * as vscode from "vscode";

beforeEach(() => {
  jest.clearAllMocks();
  
  (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
    get: jest.fn(),
    update: jest.fn(),
  });
});

