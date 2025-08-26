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

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pomodoro Timer</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1e1e1e; color: #ccc; }
        h2 { color: #fff; }
        button { padding: 5px 10px; margin: 5px; background: #333; color: #fff; border: none; cursor: pointer; }
        button:hover { background: #444; }
        input { padding: 5px; margin: 5px; background: #222; color: #fff; border: 1px solid #444; }
        .preset-btn { background: #005cc5; }
        .preset-btn:hover { background: #0066cc; }
      </style>
    </head>
    <body>
      <h2>Pomodoro Timer</h2>
      <div>
        <label for="customTime">Custom Time (minutes, up to 60): </label>
        <input type="number" id="customTime" min="1" max="60" value="25">
        <button onclick="setCustomTime()">Set</button>
      </div>
      <div>
        <button class="preset-btn" onclick="setPreset('work')">Work (25m)</button>
        <button class="preset-btn" onclick="setPreset('shortBreak')">Short Break (5m)</button>
        <button class="preset-btn" onclick="setPreset('longBreak')">Long Break (15m)</button>
      </div>
      <div>
        <button onclick="startTimer()">Start</button>
        <button onclick="pauseTimer()">Pause</button>
        <button onclick="resumeTimer()">Resume</button>
        <button onclick="resetTimer()">Reset</button>
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        function setCustomTime() {
          const time = parseInt(document.getElementById('customTime').value);
          if (time > 0 && time <= 60) {
            vscode.postMessage({ command: 'setTime', duration: time * 60, isWork: true });
          } else {
            alert('Please enter a time between 1 and 60 minutes.');
          }
        }

        function setPreset(type) {
          const durations = ${JSON.stringify(PRESETS)};
          vscode.postMessage({ command: 'setTime', duration: durations[type], isWork: type === 'work' });
        }

        function startTimer() {
          vscode.postMessage({ command: 'start' });
        }

        function pauseTimer() {
          vscode.postMessage({ command: 'pause' });
        }

        function resumeTimer() {
          vscode.postMessage({ command: 'resume' });
        }

        function resetTimer() {
          vscode.postMessage({ command: 'reset' });
        }

        // Handle messages from the extension
        window.addEventListener('message', event => {
          const message = event.data;
          switch (message.command) {
            case 'update':
              // Update UI if needed (e.g., remaining time)
              break;
          }
        });
      </script>
    </body>
    </html>
  `;

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