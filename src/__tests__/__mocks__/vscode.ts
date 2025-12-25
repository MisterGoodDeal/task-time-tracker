export const workspace = {
  getConfiguration: jest.fn(),
  onDidChangeConfiguration: jest.fn(),
  workspaceFolders: [],
  createFileSystemWatcher: jest.fn(),
  fs: {
    writeFile: jest.fn(),
  },
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createTreeView: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const env = {
  openExternal: jest.fn(),
};

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export const ThemeIcon = jest.fn();

export const Uri = {
  parse: jest.fn(),
  file: jest.fn((path: string) => ({
    fsPath: path,
    path: path,
    scheme: "file",
    authority: "",
    query: "",
    fragment: "",
    with: jest.fn(),
    toString: jest.fn().mockReturnValue(`file://${path}`),
  })),
  joinPath: jest.fn((base: { fsPath: string }, ...paths: string[]) => {
    const fullPath = [base.fsPath, ...paths].join("/");
    return {
      fsPath: fullPath,
      path: fullPath,
      scheme: "file",
      authority: "",
      query: "",
      fragment: "",
      with: jest.fn(),
      toString: jest.fn().mockReturnValue(`file://${fullPath}`),
    };
  }),
};

export const EventEmitter = jest.fn().mockImplementation(() => ({
  fire: jest.fn(),
  event: {},
  dispose: jest.fn(),
}));

export const RelativePattern = jest.fn();

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};
