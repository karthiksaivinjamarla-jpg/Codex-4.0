// Load shared site components into pages that opt into the refactored shell.
async function loadComponent(targetId, path) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    target.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadComponent('navbar', '../components/navbar.html');
  loadComponent('footer', '../components/footer.html');
});
