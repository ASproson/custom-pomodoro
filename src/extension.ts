import * as vscode from 'vscode';

// Global variables
let statusBarItem: vscode.StatusBarItem;
let timerInterval: NodeJS.Timeout;
let remainingTime: number = 0 // In seconds
let isRunning: boolean = false
let isWork: boolean = true

const PRESETS = {
	work: 25 * 60, // 25 minutes
	shortBreak: 5 * 60, // 5 minutes
	longBreak: 15 * 60 // 15 minutes
}

export function activate(context: vscode.ExtensionContext) {
	// Create and configure status bar item
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
	statusBarItem.text = `$(clock) Pomodoro: --:--`
	statusBarItem.command = 'custom-pomodoro.showUI'
	statusBarItem.tooltip = 'Click to open Pomodoro UI'
	statusBarItem.show()

	  // Register commands
  const disposableShowUI = vscode.commands.registerCommand('custom-pomodoro.showUI', () => {
    showPomodoroUI(context);
  });

	// Add disposables to context for cleanup
	context.subscriptions.push(disposableShowUI);
	context.subscriptions.push(statusBarItem)

	// Initial update
	updateStatusBarItem();
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (timerInterval) clearInterval(timerInterval);
  if (statusBarItem) statusBarItem.dispose();
}

function updateStatusBarItem(): void {
  if (!isRunning || remainingTime <= 0) {
    statusBarItem.text = '$(clock) Pomodoro: --:--';
    return;
  }
  const minutes = String(Math.floor(remainingTime / 60)).padStart(2, '0');
  const seconds = String(remainingTime % 60).padStart(2, '0');
  statusBarItem.text = `$(clock) ${isWork ? 'Work' : 'Break'}: ${minutes}:${seconds}`;
}

function startTimer(duration: number, isWorkTime: boolean, context: vscode.ExtensionContext) {
  if (isRunning) clearInterval(timerInterval); // Stop any existing timer
  remainingTime = duration;
  isWork = isWorkTime;
  isRunning = true;

  timerInterval = setInterval(() => {
    remainingTime--;
    updateStatusBarItem();
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      vscode.window.showInformationMessage(`Time's up! ${isWork ? 'Break time!' : 'Back to work!'}`);
      // Optionally auto-switch: start break after work, or work after long break
      if (isWork) startTimer(PRESETS.shortBreak, false, context); // Start short break after work
    }
  }, 1000);

  context.subscriptions.push({ dispose: () => clearInterval(timerInterval) });
  updateStatusBarItem();
}

function showPomodoroUI(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'pomodoroUI',
    'Pomodoro Timer',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  // Get the path to the webview.html file relative to the extension
  const webviewHtmlPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview.html');
  
  // Read the HTML file content asynchronously
  (async () => {
    try {
      const data = await vscode.workspace.fs.readFile(webviewHtmlPath);
      const htmlContent = new TextDecoder().decode(data); // Convert Uint8Array to string
      panel.webview.html = htmlContent;
    } catch (error) {
      console.error('Error loading webview.html:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      panel.webview.html = '<html><body><h1>Error loading Pomodoro UI</h1><p>Details: ' + errorMessage + '</p></body></html>';
    }
  })();

  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case 'setTime':
          startTimer(message.duration, message.isWork, context);
          break;
        case 'start':
          if (!isRunning && remainingTime > 0) startTimer(remainingTime, isWork, context);
          break;
        case 'pause':
          if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            updateStatusBarItem();
          }
          break;
        case 'resume':
          if (!isRunning && remainingTime > 0) startTimer(remainingTime, isWork, context);
          break;
        case 'reset':
          clearInterval(timerInterval);
          isRunning = false;
          remainingTime = 0;
          updateStatusBarItem();
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}