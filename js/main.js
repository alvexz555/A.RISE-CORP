// Navegação da página inicial
const projectsButton = document.getElementById("projects-toggle");

if (projectsButton) {
  projectsButton.addEventListener("click", () => {
    window.location.href = "./projetos/";
  });
}
