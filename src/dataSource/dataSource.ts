export interface McMetaAnimation {
  interpolate: boolean;
  frames: AnimationFrame[];
}

export interface AnimationFrame {
  frameTime: number;
  index: number;
}

export interface Item {
  imagePath?: string;
  mcMetaPath?: string;
  audioPath?: string;
}

export interface LoadedItem {
  image?: HTMLImageElement;
  animation?: McMetaAnimation;
  audio?: HTMLAudioElement;
}

export type AssetType = "textures" | "sounds";

export interface Folder {
  subfolders: Map<string, Folder>;
  items: Map<string, Item>;
}

export interface DataSource {
  getNavBarClass(): string;
  addDescriptionToNav(menu: HTMLElement): void;
  addItemsToMenu?(menu: HTMLElement): void;
  getRootFolder(assetType: AssetType): Promise<Folder>;
  loadItem(item: Item): Promise<LoadedItem>;
}
