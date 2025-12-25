import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('cra-aubay.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World depuis CRA Aubay!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

