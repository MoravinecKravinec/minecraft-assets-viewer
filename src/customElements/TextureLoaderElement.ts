import { DataSource, Item, LoadedItem } from "../dataSource/dataSource";
import { AnimatedTextureElement } from "./AnimatedTextureElement";
import { AudioElement } from "./AudioElement";

export class TextureLoaderElement extends HTMLElement {
  public size?: number = 64;
  public item?: Item;
  public dataSource?: DataSource;

  constructor() {
    super();
  }

  async connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    const container = document.createElement("div");
    container.style.minWidth = `${this.size}px`;
    container.style.minHeight = `${this.size}px`;
    shadow.append(container);

    if (!this.item || !this.dataSource) {
      throw new Error("item and data source are required");
    }

    const loadedItem = await this.dataSource.loadItem(this.item);

    const element = this.getElementForItem(loadedItem);
    container.append(element);
  }

  private getElementForItem(item: LoadedItem) {
    if (item.audio) {
      const audioElement = document.createElement("audio-element") as AudioElement;
      audioElement.item = item;
      audioElement.size = this.size;
      return audioElement;
    }

    if (item.animation && item.image) {
      const animatedTexture = document.createElement(
        "animated-texture"
      ) as AnimatedTextureElement;

      animatedTexture.item = item;
      animatedTexture.size = this.size;
      return animatedTexture;
    }

    if (item.image) {
      const staticTexture = document.createElement("div");
      staticTexture.style.backgroundImage = `url("${item.image.src}")`;
      staticTexture.style.backgroundSize = "contain";
      staticTexture.style.backgroundRepeat = "no-repeat";
      staticTexture.style.backgroundPosition = "center";
      staticTexture.style.imageRendering = "pixelated";
      staticTexture.style.width = `${this.size}px`;
      staticTexture.style.height = `${this.size}px`;
      return staticTexture;
    }

    // Fallback for unknown item types
    const fallback = document.createElement("div");
    fallback.style.width = `${this.size}px`;
    fallback.style.height = `${this.size}px`;
    fallback.style.backgroundColor = "#666";
    fallback.style.display = "flex";
    fallback.style.alignItems = "center";
    fallback.style.justifyContent = "center";
    fallback.textContent = "?";
    return fallback;
  }
}
