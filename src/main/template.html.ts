/* Copyright 2021, Milkdown by Mirone.*/
import * as vscode from 'vscode';
import { getNonce } from './get-nonce';

export const getHtmlTemplateForWebView = (webview: vscode.Webview, extensionUri: vscode.Uri) => {
    const getMediaUri = (fileName: string) => webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', fileName));

    const scriptUri = getMediaUri('view.global.js');
    const styleUri = getMediaUri('style.css');
    const diagramStyleUri = getMediaUri('view.css');
    const nonce = getNonce();
    const csp = [
        "default-src 'none'",
        `img-src ${webview.cspSource} https: data: blob:`,
        `media-src ${webview.cspSource}`,
        `font-src ${webview.cspSource} data:`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `style-src-attr 'unsafe-inline'`,
        `script-src 'nonce-${nonce}'`,
        'worker-src blob:',
    ].join('; ');

    return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="${csp}">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet" />
                <link href="${diagramStyleUri}" rel="stylesheet" />
				<title>Milkdown</title>
			</head>
			<body>
                <div id="app"></div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
};
