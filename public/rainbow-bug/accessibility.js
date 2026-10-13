/** Provide an untimed, nonvisual adventure and scope real-time controls to the focused game. */
let visualPaused = true;
let adventureLevel = 0;
let collected = new Set();
let adventureLives = 3;
const visualStage = document.querySelector('.game-stage');
const adventure = document.getElementById('text-adventure');
const adventureStatus = document.getElementById('adventure-status');
const pause = document.getElementById('pause-game');
const playStyle = document.getElementById('play-style');
musicEnabled = false;
sfxEnabled = false;
musicEnabledToggle.checked = false;
sfxEnabledToggle.checked = false;
/** Clear held keys and pause animation/audio whenever the player leaves the game. */
function pauseVisual() {
  visualPaused = true;
  Object.keys(keys).forEach(key => { keys[key] = false; });
  pause.textContent = 'Start visual game';
  if (audioState?.musicGain) audioState.musicGain.gain.value = 0;
}
/** Describe the current level using the original game's rainbow and hazard layout. */
function describeAdventure() {
  const level = levels[adventureLevel];
  document.getElementById('adventure-heading').textContent = `Level ${adventureLevel + 1} of ${levels.length}: ${level.name}`;
  document.getElementById('adventure-score').textContent = `${collected.size} of ${level.rainbows.length} rainbows collected. ${adventureLives} lives.`;
  const routes = document.getElementById('adventure-routes');
  routes.replaceChildren();
  level.rainbows.forEach((rainbow, index) => {
    if (collected.has(index)) return;
    const hazards = [...level.bugs, ...level.fireflies].filter(bug => Math.abs(bug.x - rainbow.x) < 150);
    const item = document.createElement('li');
    const description = document.createElement('p');
    const zone = rainbow.x < 320 ? 'left' : rainbow.x < 640 ? 'middle' : 'right';
    const elevated = rainbow.y < 400;
    description.textContent = `Rainbow ${index + 1}: ${zone} of the level, ${elevated ? 'on a raised platform; use the jumping route' : 'near the ground; use the walking route'}. ${hazards.length ? 'Nearby: ' + hazards.map(b => b.species).join(', ') + '. Wait for them to pass or use a protected route.' : 'No nearby bugs.'}`;
    item.append(description);
    for (const route of ['walk', 'jump', 'protected']) {
      const button = document.createElement('button');
      button.textContent = `${route === 'protected' ? 'Wait, then take the safe route' : route === 'jump' ? 'Jump along platforms' : 'Walk along the ground'} to rainbow ${index + 1}`;
      button.addEventListener('click', () => collectRainbow(index, route));
      item.append(button);
    }
    routes.append(item);
  });
  document.getElementById('next-adventure-level').hidden = collected.size !== level.rainbows.length;
}
/** Resolve an untimed route choice, retaining feedback without a precision or reflex requirement. */
function collectRainbow(index, route) {
  const level = levels[adventureLevel], rainbow = level.rainbows[index];
  if ((rainbow.y < 400 && route === 'walk') || (rainbow.y >= 400 && route === 'jump')) {
    adventureStatus.textContent = 'That route does not reach this rainbow. Read its height and try another route.';
    return;
  }
  const nearby = [...level.bugs, ...level.fireflies].some(bug => Math.abs(bug.x - rainbow.x) < 150);
  if (nearby && route !== 'protected' && !easyModeToggle.checked) {
    adventureLives--;
    if (!adventureLives) { adventureLives = 3; collected.clear(); adventureStatus.textContent = 'Three bug encounters. This level has restarted; wait for bugs before travelling.'; }
    else adventureStatus.textContent = `A nearby bug blocked your route. ${adventureLives} lives remain. Try waiting for a safe route.`;
  } else { collected.add(index); adventureStatus.textContent = `Rainbow ${index + 1} collected. ${collected.size === level.rainbows.length ? 'Level complete. Continue when ready.' : 'Choose your next route.'}`; }
  describeAdventure();
  // Removed route buttons cannot keep focus; the level summary becomes the stable reading point.
  document.getElementById('adventure-heading').focus();
}
/** Run real-time frames only after an explicit start and while the game is visible. */
function accessibleLoop() {
  if (!visualPaused && !visualStage.hidden) {
    scheduleMusic();
    if (gameMode === 'platformer') { updatePlayer(); updateBugs(); updateFireflies(); updatePuddles(); updateRainbows(); drawGame(); }
    else if (gameMode === 'pinball') { updatePinballGame(); drawPinballGame(); }
    else { updateDominoGame(); drawDominoGame(); }
  }
  requestAnimationFrame(accessibleLoop);
}
/** Apply the selected mode without resetting either mode's progress. */
function selectPlayStyle() {
  pauseVisual();
  visualStage.hidden = playStyle.value !== 'visual';
  adventure.hidden = !visualStage.hidden;
  document.querySelector(".stats").hidden = !adventure.hidden;
  pause.hidden = visualStage.hidden;
  if (!adventure.hidden) describeAdventure();
}
pause.addEventListener('click', () => {
  if (!visualPaused) return pauseVisual();
  visualPaused = false; pause.textContent = 'Pause visual game'; canvas.focus();
  if (musicEnabled) { startMusic(); if (audioState) audioState.musicGain.gain.value = 0.32; }
});
canvas.addEventListener('blur', pauseVisual);
for (const control of [leftButton,rightButton,jumpButton,swatButton]) control.addEventListener('pointerdown',()=>{visualPaused=false;pause.textContent='Pause visual game';});
window.addEventListener('blur', pauseVisual);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseVisual(); });
canvas.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); pauseVisual(); pause.focus(); return; }
  const tracked = ['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','KeyE','KeyF'];
  if (!tracked.includes(event.code)) return;
  event.preventDefault();
  if (!visualPaused) setKeyState(event.code, true);
});
canvas.addEventListener('keyup', event => { setKeyState(event.code, false); });
playStyle.addEventListener('change', selectPlayStyle);
document.getElementById('next-adventure-level').addEventListener('click', () => {
  if (adventureLevel === levels.length - 1) { adventureStatus.textContent = 'All five levels complete! You collected every rainbow.'; return; }
  adventureLevel++; collected.clear(); describeAdventure(); adventureStatus.textContent = 'Next level ready. Read the routes and choose at your own pace.'; document.getElementById('adventure-heading').focus();
});
document.getElementById('restart-adventure').addEventListener('click', () => { adventureLevel = 0; collected.clear(); adventureLives = 3; describeAdventure(); adventureStatus.textContent = 'Adventure restarted.'; });
const motion = matchMedia('(prefers-reduced-motion: reduce)');
/** Pause and offer the untimed mode when either system or site motion preference requests it. */
function respectMotion() { if (motion.matches || document.documentElement.hasAttribute('data-a11y-motion')) { playStyle.value = 'text'; selectPlayStyle(); } }
motion.addEventListener('change', respectMotion);
document.addEventListener('accessibilitychange', respectMotion);
selectPlayStyle(); respectMotion(); drawGame(); accessibleLoop();
