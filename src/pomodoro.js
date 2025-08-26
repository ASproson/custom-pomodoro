const vscode = acquireVsCodeApi();

function setCustomTime() {
  const time = parseInt(document.getElementById('customTime').value);
  if (time > 0 && time <= 60) {
    vscode.postMessage({ command: 'addToRoutine', duration: time * 60, isWork: true });
  } else {
    alert('Please enter a time between 1 and 60 minutes.');
  }
}

function setPreset(type) {
  const durations = {
    work: 25 * 60,
    longWork: 50 * 60,
    shortBreak: 5 * 60,
    midBreak: 10 * 60,
    longBreak: 15 * 60,
  };
  vscode.postMessage({ command: 'addToRoutine', duration: durations[type], isWork: type.includes('work') });
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

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'updateRoutine':
      const routineList = document.getElementById('routineList');
      routineList.innerHTML = message.routine
        .map((item) => `<li>${item.isWork ? 'Work' : 'Break'} ${Math.floor(item.duration / 60)}m</li>`)
        .join('');
      break;
  }
});
