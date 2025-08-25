import * as vscode from 'vscode';

// "onStartUpFinished" in package.json auto-starts

// Global variables
let statusBarItem: vscode.StatusBarItem;
let clockInterval: NodeJS.Timeout; // To store the interval for cleanup

// Method is called on extension activation
export function activate(context: vscode.ExtensionContext) {
  // Create and configure the status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(clock) Loading...'; // Initial text with codicon
  statusBarItem.show();

  // Start the clock update interval
  clockInterval = setInterval(updateStatusBarItem, 1000); // Update every second
  context.subscriptions.push({ dispose: () => clearInterval(clockInterval) }); // Cleanup interval

  // Register commands
  const disposableHi = vscode.commands.registerCommand('custom-pomodoro.hiWorld', () => {
    vscode.window.showInformationMessage('Hi from Custom Pomodoro!');
  });

  const disposableTime = vscode.commands.registerCommand('custom-pomodoro.time', () => {
    const date = new Date();
    const hour = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    vscode.window.showInformationMessage(`Current time is ${hour}:${min}:${sec}`);
  });

  // Add disposables to context for cleanup
  context.subscriptions.push(disposableHi);
  context.subscriptions.push(disposableTime);
  context.subscriptions.push(statusBarItem);

  // Initial update
  updateStatusBarItem();
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (clockInterval) {
    clearInterval(clockInterval); // Clean up the interval
  }
  if (statusBarItem) {
    statusBarItem.dispose(); // Clean up the status bar item
  }
}

/**
 * Updates status bar item with current time, using in-built codicon
 */
function updateStatusBarItem(): void {
  const date = new Date();
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  const timer = `${hour}:${min}:${sec}`;
  statusBarItem.text = `$(clock) ${timer}`; 
}