// navigation.js – simple UI navigation helpers

export function switchTab(tab) {
  document.getElementById('view-library').style.display = tab === 'library' ? '' : 'none';
  document.getElementById('view-train').style.display = tab === 'train' ? '' : 'none';

  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById('tab-' + tab);
  if (activeBtn) activeBtn.classList.add('active');

  // When switching to train, render warnings initially
  if (tab === 'train') {
    renderTrainWarnings();
  }
}

export function bgClose(event, id) {
  if (event.target === document.getElementById(id)) {
    document.getElementById(id).style.display = 'none';
  }
}