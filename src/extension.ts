import * as vscode from 'vscode';
import { UnrealIRCdHoverProvider } from './hoverProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('UnrealIRCd extension is now active!');

    // Register the hover provider
    const hoverProvider = new UnrealIRCdHoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('unrealircd', hoverProvider)
    );
}

export function deactivate() {}