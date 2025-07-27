import { LoadedItem } from "../dataSource/dataSource";

export class AudioElement extends HTMLElement {
  public item?: LoadedItem;
  public size?: number = 64;

  constructor() {
    super();
  }

  async connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    const container = document.createElement("div");
    container.style.width = `${this.size}px`;
    container.style.height = `${this.size}px`;
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.backgroundColor = "#333";
    container.style.borderRadius = "4px";
    container.style.cursor = "pointer";
    container.style.transition = "background-color 0.2s";

    container.addEventListener("mouseenter", () => {
      container.style.backgroundColor = "#444";
    });

    container.addEventListener("mouseleave", () => {
      container.style.backgroundColor = "#333";
    });

    // Audio icon
    const audioIcon = document.createElement("div");
    audioIcon.innerHTML = "🔊";
    audioIcon.style.fontSize = "24px";
    audioIcon.style.marginBottom = "4px";

    // Play button
    const playButton = document.createElement("button");
    playButton.textContent = "▶";
    playButton.style.background = "none";
    playButton.style.border = "none";
    playButton.style.color = "white";
    playButton.style.fontSize = "16px";
    playButton.style.cursor = "pointer";
    playButton.style.padding = "4px";

    playButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.item?.audio) {
        if (this.item.audio.paused) {
          this.item.audio.play();
          playButton.textContent = "⏸";
        } else {
          this.item.audio.pause();
          playButton.textContent = "▶";
        }
      }
    });

    // Audio element
    if (this.item?.audio) {
      this.item.audio.addEventListener("ended", () => {
        playButton.textContent = "▶";
      });
    }

    container.append(audioIcon, playButton);
    shadow.append(container);
  }
} 