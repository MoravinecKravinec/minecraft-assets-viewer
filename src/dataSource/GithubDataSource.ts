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

export class GithubDataSource implements DataSource {
  constructor(
    private username: string,
    private repo: string,
    private branch: string,
    private root: string
  ) {}

  getNavBarClass(): string {
    return "github";
  }

  addDescriptionToNav(menu: HTMLElement): void {
    const title = document.createElement("div");
    title.innerText = `${this.username}/${this.repo}`;
    const subtitle = document.createElement("div");
    subtitle.innerText = "GitHub";

    menu.append(title);
    menu.append(subtitle);
  }

  addItemsToMenu(menu: HTMLElement): void {
    const viewOnGithub = document.createElement("div");
    viewOnGithub.innerText = "View on GitHub";
    viewOnGithub.addEventListener("click", () => {
      window.open(`https://github.com/${this.username}/${this.repo}`);
    });
    menu.append(viewOnGithub);
  }

  async getRootFolder(assetType: AssetType): Promise<Folder> {
    const treeUrl = `https://api.github.com/repos/${this.username}/${this.repo}/git/trees/${this.branch}?recursive=1`;
    const githubDirectoryListing = await fetch(treeUrl);
    const { tree } = await githubDirectoryListing.json();

    const rootFolder = createFolder();

    let regex: RegExp;
    if (assetType === "textures") {
      regex = /^(.*)\/(.*)\.png(\.mcmeta)?$/;
    } else {
      regex = /^(.*)\/(.*)\.ogg$/;
    }

    for (const item of tree) {
      const matches = item.path.match(regex);
      if (!matches) continue;

      const [, folders, name, mcMeta] = matches as [
        unknown,
        string,
        string,
        string?
      ];

      if (!folders.startsWith(this.root)) continue;

      const folder = this.findOrCreateSubfolder(rootFolder, folders);

      if (assetType === "textures") {
        const isAnimated = mcMeta != null;
        const itemExists = folder.items.has(name);

        if (!itemExists || isAnimated) {
          folder.items.set(name, {
            imagePath: `${folders}/${name}.png`,
            mcMetaPath: isAnimated ? `${folders}/${name}.png.mcmeta` : undefined
          });
        }
      } else {
        // For sounds
        folder.items.set(name, {
          audioPath: `${folders}/${name}.ogg`
        });
      }
    }

    return rootFolder;
  }

  async loadItem(item: Item): Promise<LoadedItem> {
    if (item.audioPath) {
      const audio = await this.loadAudio(item.audioPath);
      return {
        audio
      };
    }

    if (item.imagePath) {
      const image = await this.loadImage(item.imagePath);
      const animation = await this.loadMcMeta(item.mcMetaPath, image);

      return {
        image,
        animation
      };
    }

    throw new Error("Item has neither imagePath nor audioPath");
  }

  private findOrCreateSubfolder(rootFolder: Folder, foldersString: string) {
    const folders = foldersString.split("/");

    let parentFolder = rootFolder;

    for (const folderName of folders) {
      if (!parentFolder.subfolders.has(folderName)) {
        parentFolder.subfolders.set(folderName, createFolder());
      }

      parentFolder = parentFolder.subfolders.get(folderName) as Folder;
    }

    return parentFolder;
  }

  private getGithubUserContentPath(path: string): string {
    return `https://raw.githubusercontent.com/${this.username}/${this.repo}/${this.branch}/${path}`;
  }

  private loadImage(imagePath: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const image = new Image();
      image.src = this.getGithubUserContentPath(imagePath);
      image.crossOrigin = "anonymous";
      image.addEventListener("load", () => {
        resolve(image);
      });
    });
  }

  private loadAudio(audioPath: string): Promise<HTMLAudioElement> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = this.getGithubUserContentPath(audioPath);
      audio.preload = "metadata";
      audio.addEventListener("canplaythrough", () => {
        resolve(audio);
      });
      audio.addEventListener("error", () => {
        // If canplaythrough fails, still resolve with the audio element
        resolve(audio);
      });
    });
  }

  private async loadMcMeta(
    mcMetaPath: string | undefined,
    image: HTMLImageElement
  ): Promise<McMetaAnimation | undefined> {
    if (!mcMetaPath) return;

    try {
      const mcMetaFile = await fetch(this.getGithubUserContentPath(mcMetaPath));
      const mcMetaJson = await mcMetaFile.json();
      return translateMcMetaAnimation(mcMetaJson, image);
    } catch (error) {
      console.error(`Couldn't load ${mcMetaPath}:`, error);
    }
  }
}
