import * as vscode from 'vscode';

// Global variables
let statusBarItem: vscode.StatusBarItem;
let timerInterval: NodeJS.Timeout;
let remainingTime: number = 0; // In seconds
let isRunning: boolean = false;
let isWork: boolean = true;
let routine: { duration: number; isWork: boolean }[] = [];
let currentIndex = 0;

export function activate(context: vscode.ExtensionContext) {
  // Create and configure status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = `$(clock) Pomodoro: --:--`;
  statusBarItem.command = 'custom-pomodoro.showUI';
  statusBarItem.tooltip = 'Click to open Pomodoro UI';
  statusBarItem.show();

  // Register commands
  const disposableShowUI = vscode.commands.registerCommand('custom-pomodoro.showUI', () => {
    showPomodoroUI(context);
  });

  // Add disposables to context for cleanup
  context.subscriptions.push(disposableShowUI);
  context.subscriptions.push(statusBarItem);

  // Initial update
  updateStatusBarItem();
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (timerInterval) clearInterval(timerInterval);
  if (statusBarItem) statusBarItem.dispose();
}

function updateStatusBarItem(): void {
  if (remainingTime <= 0) {
    statusBarItem.text = '$(clock) Pomodoro: --:--';
    return;
  }
  const minutes = String(Math.floor(remainingTime / 60)).padStart(2, '0');
  const seconds = String(remainingTime % 60).padStart(2, '0');
  statusBarItem.text = `$(clock) ${isWork ? 'Work' : 'Break'}: ${minutes}:${seconds} (Step ${currentIndex + 1}/${
    routine.length
  }) ${isRunning ? '' : '(Paused)'}`;
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
      currentIndex++;
      if (currentIndex < routine.length) {
        // Move to the next item in the routine
        startTimer(routine[currentIndex].duration, routine[currentIndex].isWork, context);
      } else {
        vscode.window.showInformationMessage('Routine completed!');
        currentIndex = 0; // Reset for next use
      }
    }
  }, 1000);

  context.subscriptions.push({ dispose: () => clearInterval(timerInterval) });
  updateStatusBarItem();
}

function showPomodoroUI(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel('pomodoroUI', 'Pomodoro Timer', vscode.ViewColumn.One, {
    enableScripts: true,
  });

  // Get the path to the webview.html file relative to the extension
  const webviewHtmlPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview.html');
  const webviewJsPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'pomodoro.js');

  // Read the HTML file content asynchronously
  (async () => {
    try {
      const data = await vscode.workspace.fs.readFile(webviewHtmlPath);
      let htmlContent = new TextDecoder().decode(data); // Convert Uint8Array to string

      // Convert the JS file URI to a Webview URI
      const jsUri = panel.webview.asWebviewUri(webviewJsPath);
      console.log('JS URI:', jsUri.toString()); // Debug log to verify URI

      // Replace the script src placeholder with the Webview URI
      htmlContent = htmlContent.replace('<script></script>', `<script src="${jsUri}"></script>`);
      panel.webview.html = htmlContent;
    } catch (error) {
      console.error('Error loading webview files:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      panel.webview.html =
        '<html><body><h1>Error loading Pomodoro UI</h1><p>Details: ' + errorMessage + '</p></body></html>';
    }
  })();

  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case 'addToRoutine':
          routine.push({ duration: message.duration, isWork: message.isWork });
          panel.webview.postMessage({ command: 'updateRoutine', routine });
          break;
        case 'start':
          if (routine.length === 0) {
            vscode.window.showInformationMessage('No routine set!');
            break;
          }
          if (!isRunning && currentIndex < routine.length) {
            startTimer(routine[currentIndex].duration, routine[currentIndex].isWork, context);
          }
          break;
        case 'pause':
          if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            updateStatusBarItem();
          }
          break;
        case 'resume':
          if (!isRunning && remainingTime > 0 && currentIndex < routine.length) {
            startTimer(remainingTime, isWork, context);
          }
          break;
        case 'reset':
          clearInterval(timerInterval);
          isRunning = false;
          remainingTime = 0;
          currentIndex = 0; // Reset to start of routine
          routine = []; // Clear routine on reset
          updateStatusBarItem();
          panel.webview.postMessage({ command: 'updateRoutine', routine });
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}
