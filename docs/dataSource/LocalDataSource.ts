import { createFolder } from "./createFolder";
import {
  DataSource,
  Folder,
  Item,
  LoadedItem,
  McMetaAnimation,
  AssetType
} from "./dataSource";
import { translateMcMetaAnimation } from "./translateMcMetaAnimation";

export class LocalDataSource implements DataSource {
  constructor(private directory: FileSystemDirectoryHandle) {}

  getNavBarClass(): string {
    return "local";
  }

  addDescriptionToNav(menu: HTMLElement): void {
    const title = document.createElement("div");
    title.innerText = this.directory.name;
    const subtitle = document.createElement("div");
    subtitle.innerText = "Local";

    menu.append(title);
    menu.append(subtitle);
  }

  async getRootFolder(assetType: AssetType): Promise<Folder> {
    return this.loadFoldersRecursively(this.directory, "", assetType);
  }

  async loadItem(item: Item): Promise<LoadedItem> {
    if (item.audioPath) {
      const audioHandle = await this.findAudioFile(item);
      const audio = await this.loadAudio(audioHandle);
      return {
        audio
      };
    }

    if (item.imagePath) {
    const { imageHandle, mcMetaHandle } = await this.findImageAndMcMeta(item);

    const image = await this.loadImage(imageHandle);
    const animation = await this.loadMcMeta(
      mcMetaHandle,
      item.mcMetaPath,
      image
    );

    return {
      image,
      animation
    };
    }

    throw new Error("Item has neither imagePath nor audioPath");
  }

  private async loadFoldersRecursively(
    parent: FileSystemDirectoryHandle,
    path: string,
    assetType: AssetType
  ): Promise<Folder> {
    const folder = createFolder();

    let regex: RegExp;
    if (assetType === "textures") {
      regex = /(.*)\.png(\.mcmeta)?/;
    } else {
      regex = /(.*)\.ogg/;
    }

    for await (const [name, handle] of parent.entries()) {
      if (handle.kind === "directory") {
        const subfolder = await this.loadFoldersRecursively(
          handle,
          `${path}/${name}`,
          assetType
        );
        folder.subfolders.set(name, subfolder);
        continue;
      }

      const matches = name.match(regex);
      if (!matches) continue;
      const [, itemName, mcMeta] = matches as [unknown, string, string];

      if (assetType === "textures") {
      const isAnimated = mcMeta != null;
      const itemExists = folder.items.has(name);

      if (!itemExists || isAnimated) {
        folder.items.set(itemName, {
          imagePath: `${path}/${itemName}.png`,
          mcMetaPath: isAnimated ? `${path}/${itemName}.png.mcmeta` : undefined
          });
        }
      } else {
        // For sounds
        folder.items.set(itemName, {
          audioPath: `${path}/${itemName}.ogg`
        });
      }
    }

    return folder;
  }

  private async findImageAndMcMeta(item: Item) {
    if (!item.imagePath) throw new Error("Item has no imagePath");
    
    const parts = item.imagePath.slice(1).split("/");

    let folder = this.directory;
    for (const part of parts.slice(0, -1)) {
      folder = await folder.getDirectoryHandle(part);
    }

    const itemName = parts.at(-1);
    if (!itemName) throw new Error("Couldn't find item");

    let imageHandle = await folder.getFileHandle(itemName);
    let mcMetaHandle;

    if (item.mcMetaPath) {
      mcMetaHandle = await folder.getFileHandle(`${itemName}.mcmeta`);
    }

    return { imageHandle, mcMetaHandle };
  }

  private async findAudioFile(item: Item) {
    if (!item.audioPath) throw new Error("Item has no audioPath");
    
    const parts = item.audioPath.slice(1).split("/");

    let folder = this.directory;
    for (const part of parts.slice(0, -1)) {
      folder = await folder.getDirectoryHandle(part);
    }

    const itemName = parts.at(-1);
    if (!itemName) throw new Error("Couldn't find audio item");

    return await folder.getFileHandle(itemName);
  }

  private async loadImage(
    imageHandle: FileSystemFileHandle
  ): Promise<HTMLImageElement> {
    return new Promise(async (resolve) => {
      const file = await imageHandle.getFile();
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        const image = new Image();
        image.src = reader.result as string;
        resolve(image);
      });

      reader.readAsDataURL(file);
    });
  }

  private async loadAudio(
    audioHandle: FileSystemFileHandle
  ): Promise<HTMLAudioElement> {
    return new Promise(async (resolve) => {
      const file = await audioHandle.getFile();
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        const audio = new Audio();
        audio.src = reader.result as string;
        audio.preload = "metadata";
        resolve(audio);
      });

      reader.readAsDataURL(file);
    });
  }

  private async loadMcMeta(
    mcMetaHandle: FileSystemFileHandle | undefined,
    mcMetaPath: string | undefined,
    image: HTMLImageElement
  ): Promise<McMetaAnimation | undefined> {
    if (!mcMetaHandle) return;

    let fileText;

    try {
      const file = await mcMetaHandle.getFile();
      fileText = await file.text();
      const mcMetaJson = JSON.parse(fileText);
      return translateMcMetaAnimation(mcMetaJson, image);
    } catch (error) {
      console.error(`Couldn't load ${mcMetaPath}:`, error, fileText);
    }
  }
}
