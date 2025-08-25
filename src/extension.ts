// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "custom-pomodoro" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('custom-pomodoro.hiWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hi from Custom Pomodoro!');
	});

	const dis = vscode.commands.registerCommand('custom-pomodoro.time', () => {
		const date = new Date();
		const hour = String(date.getHours() + 1).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');

		vscode.window.showInformationMessage(`Current time is ${hour}:${min}`);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(dis);

}

// This method is called when your extension is deactivated
export function deactivate() {}
