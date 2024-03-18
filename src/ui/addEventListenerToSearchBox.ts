export function addEventListenerToSearchBox() {
  const searchBox = document.querySelector("#search") as HTMLInputElement;

  searchBox.addEventListener("input", () => {
    const allTextures = document.querySelectorAll("[data-searchable-name]");

    allTextures.forEach((item) => {
      if (!(item instanceof HTMLElement)) return;

      const name = item.getAttribute("data-searchable-name");
      const includedInSearch = name?.includes(searchBox.value);

      item.style.display = includedInSearch ? "block" : "none";
    });
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" ||
      ((event.metaKey || event.ctrlKey) && event.key === "f")
    ) {
      event.preventDefault();
      searchBox.focus();
    }
  });
}
