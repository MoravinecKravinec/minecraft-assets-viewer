import { TextureLoaderElement } from "../customElements/TextureLoaderElement";
import { TooltipElement } from "../customElements/TooltipElement";
import { DataSource, Folder, Item, AssetType } from "../dataSource/dataSource";
import { showPreviewModal } from "./showPreviewModal";
import JSZip from "jszip";

// Global selection state
let selectedTextures: Set<string> = new Set();
let currentAssetType: AssetType = "textures";

export async function displayTexturesForDataSource(
  dataSource: DataSource
): Promise<void> {
  updateNavBarColor(dataSource);
  updateNavBarDescription(dataSource);
  updateNavBarMenuItems(dataSource);
  addDownloadButton();

  clearSearchBar();

  await displayListOfTextures(dataSource);
}

function updateNavBarColor(dataSource: DataSource) {
  const nav = document.querySelector("nav") as HTMLElement;
  nav.setAttribute("class", dataSource.getNavBarClass());
}

function updateNavBarDescription(dataSource: DataSource) {
  const description = document.querySelector(".dataSource") as HTMLElement;
  description.innerHTML = "";
  dataSource.addDescriptionToNav(description);
}

function updateNavBarMenuItems(dataSource: DataSource) {
  const extraMenuItems = document.querySelector(
    "#dataSourceMenuExtraItems"
  ) as HTMLElement;

  extraMenuItems.innerHTML = "";
  dataSource.addItemsToMenu?.(extraMenuItems);

  if (extraMenuItems.childNodes.length > 0) {
    const divider = document.createElement("div");
    divider.classList.add("divider");
    extraMenuItems.append(divider);
  }
}

function clearSearchBar() {
  const searchBar = document.querySelector("#search") as HTMLInputElement;
  searchBar.value = "";
}

async function displayListOfTextures(dataSource: DataSource) {
  const rootFolder = await dataSource.getRootFolder(currentAssetType);
  const subfolders = getAllSubfolders(rootFolder);

  const textures = document.createDocumentFragment();

  for (const folder of subfolders) {
    const searchableFolderName = folder.name.toString().trim();

    const sortedItems = [...folder.items.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [name, item] of sortedItems) {
      const searchableItemName = name.toLowerCase().trim();
      const texturePath = `${folder.name}/${name}`;

      const container = document.createElement("div");
      container.classList.add("texture-container");
      container.setAttribute(
        "data-searchable-name",
        `${searchableFolderName}/${searchableItemName}`
      );
      container.setAttribute("data-texture-path", texturePath);

      const tooltipContainer = document.createElement("tool-tip") as TooltipElement;
      tooltipContainer.text = texturePath;

      const loader = document.createElement(
        "texture-loader"
      ) as TextureLoaderElement;
      loader.dataSource = dataSource;
      loader.item = item;

      // Handle shift+click for selection
      tooltipContainer.addEventListener("click", (e) => {
        if (e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          
          if (selectedTextures.has(texturePath)) {
            selectedTextures.delete(texturePath);
            container.classList.remove("selected");
          } else {
            selectedTextures.add(texturePath);
            container.classList.add("selected");
          }
          updateDownloadButton();
        } else {
        showPreviewModal(dataSource, item);
        }
      });

      // Update visual state if already selected
      if (selectedTextures.has(texturePath)) {
        container.classList.add("selected");
      }

      tooltipContainer.append(loader);
      container.append(tooltipContainer);
      textures.append(container);
    }
  }

  const container = document.querySelector("#textures") as HTMLElement;
  container.innerHTML = "";
  container.append(textures);
  updateDownloadButton();
}

function getAllSubfolders(
  folder: Folder
): { items: Map<string, Item>; name: string }[] {
  const subfolders: { items: Map<string, Item>; name: string }[] = [];

  for (const [name, subfolder] of folder.subfolders) {
    const subSubFolders = getAllSubfolders(subfolder);
    subfolders.push(...subSubFolders);
    subfolders.push({ name, items: subfolder.items });
  }

  return subfolders;
}

function addDownloadButton() {
  const nav = document.querySelector("nav") as HTMLElement;
  
  // Remove existing download button if it exists
  const existingButton = nav.querySelector("#download-selected");
  if (existingButton) {
    existingButton.remove();
  }

  // Remove existing selection controls if they exist
  const existingControls = nav.querySelector("#selection-controls");
  if (existingControls) {
    existingControls.remove();
  }

  // Remove existing asset type toggle if it exists
  const existingToggle = nav.querySelector("#asset-type-toggle");
  if (existingToggle) {
    existingToggle.remove();
  }

  // Create asset type toggle
  const toggleContainer = document.createElement("div");
  toggleContainer.id = "asset-type-toggle";
  toggleContainer.classList.add("asset-type-toggle");

  const texturesButton = document.createElement("button");
  texturesButton.textContent = "Textures";
  texturesButton.classList.add("toggle-button");
  texturesButton.classList.toggle("active", currentAssetType === "textures");
  texturesButton.addEventListener("click", () => switchAssetType("textures"));

  const soundsButton = document.createElement("button");
  soundsButton.textContent = "Sounds";
  soundsButton.classList.add("toggle-button");
  soundsButton.classList.toggle("active", currentAssetType === "sounds");
  soundsButton.addEventListener("click", () => switchAssetType("sounds"));

  toggleContainer.append(texturesButton, soundsButton);

  // Create selection controls container
  const controlsContainer = document.createElement("div");
  controlsContainer.id = "selection-controls";
  controlsContainer.classList.add("selection-controls");

  const selectAllButton = document.createElement("button");
  selectAllButton.textContent = "Select All";
  selectAllButton.classList.add("selection-button");
  selectAllButton.addEventListener("click", selectAllTextures);

  const clearSelectionButton = document.createElement("button");
  clearSelectionButton.textContent = "Clear Selection";
  clearSelectionButton.classList.add("selection-button");
  clearSelectionButton.addEventListener("click", clearSelection);

  const downloadButton = document.createElement("button");
  downloadButton.id = "download-selected";
  downloadButton.textContent = "Download ZIP (0)";
  downloadButton.classList.add("download-button");
  downloadButton.disabled = true;
  downloadButton.addEventListener("click", downloadSelectedTextures);

  controlsContainer.append(selectAllButton, clearSelectionButton, downloadButton);
  
  // Insert before the search input
  const searchInput = nav.querySelector("#search");
  nav.insertBefore(toggleContainer, searchInput);
  nav.insertBefore(controlsContainer, searchInput);
}

function updateDownloadButton() {
  const downloadButton = document.querySelector("#download-selected") as HTMLButtonElement;
  if (downloadButton) {
    const count = selectedTextures.size;
    downloadButton.textContent = `Download ZIP (${count})`;
    downloadButton.disabled = count === 0;
  }
}

function selectAllTextures() {
  const containers = document.querySelectorAll(".texture-container") as NodeListOf<HTMLElement>;
  containers.forEach(container => {
    const texturePath = container.getAttribute("data-texture-path");
    if (texturePath) {
      selectedTextures.add(texturePath);
      container.classList.add("selected");
    }
  });
  updateDownloadButton();
}

function clearSelection() {
  selectedTextures.clear();
  const containers = document.querySelectorAll(".texture-container") as NodeListOf<HTMLElement>;
  containers.forEach(container => {
    container.classList.remove("selected");
  });
  updateDownloadButton();
}

async function switchAssetType(assetType: AssetType) {
  currentAssetType = assetType;
  selectedTextures.clear();
  
  const dataSource = (window as any).currentDataSource as DataSource;
  if (dataSource) {
    await displayListOfTextures(dataSource);
  }
  
  // Update toggle button states
  const texturesButton = document.querySelector("#asset-type-toggle .toggle-button:first-child") as HTMLButtonElement;
  const soundsButton = document.querySelector("#asset-type-toggle .toggle-button:last-child") as HTMLButtonElement;
  
  if (texturesButton && soundsButton) {
    texturesButton.classList.toggle("active", assetType === "textures");
    soundsButton.classList.toggle("active", assetType === "sounds");
  }
}

async function downloadSelectedTextures() {
  if (selectedTextures.size === 0) return;

  const dataSource = (window as any).currentDataSource as DataSource;
  if (!dataSource) {
    alert("No data source available");
    return;
  }

  try {
    const zip = new JSZip();
    
    for (const texturePath of selectedTextures) {
      await addTextureToZip(dataSource, texturePath, zip);
    }
    
    // Generate and download the zip file
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selected_textures.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error("Error downloading textures:", error);
    alert("Error downloading textures. Check console for details.");
  }
}

async function addTextureToZip(dataSource: DataSource, texturePath: string, zip: JSZip) {
  // Parse the texture path to get folder and name
  const lastSlashIndex = texturePath.lastIndexOf("/");
  const folderName = texturePath.substring(0, lastSlashIndex);
  const textureName = texturePath.substring(lastSlashIndex + 1);

  // Find the item in the data source
  const rootFolder = await dataSource.getRootFolder(currentAssetType);
  const subfolders = getAllSubfolders(rootFolder);
  
  let targetItem: Item | null = null;
  for (const folder of subfolders) {
    if (folder.name === folderName && folder.items.has(textureName)) {
      targetItem = folder.items.get(textureName)!;
      break;
    }
  }

  if (!targetItem) {
    console.error(`Texture not found: ${texturePath}`);
    return;
  }

  // Load the item
  const loadedItem = await dataSource.loadItem(targetItem);
  
  // Create canvas and draw the image
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  
  if (loadedItem.animation && loadedItem.image) {
    // For animated textures, use the first frame
    const firstFrame = loadedItem.animation.frames[0];
    const imageSize = loadedItem.image.width; // Assuming square textures
    canvas.width = imageSize;
    canvas.height = imageSize;
    
    // Draw the first frame from the animation
    const yOffset = imageSize * firstFrame.index;
    ctx.drawImage(
      loadedItem.image,
      0, yOffset, imageSize, imageSize, // source rectangle
      0, 0, imageSize, imageSize        // destination rectangle
    );
    
    // Add the .mcmeta file for animated textures
    const mcMetaContent = generateMcMetaContent(loadedItem.animation);
    zip.file(`${texturePath}.mcmeta`, mcMetaContent);
    
  } else if (loadedItem.image) {
    // For static textures
    canvas.width = loadedItem.image.naturalWidth;
    canvas.height = loadedItem.image.naturalHeight;
    ctx.drawImage(loadedItem.image, 0, 0);
  } else if (loadedItem.audio) {
    // For audio files, we'll add them directly to the zip
    // This will be handled separately since we can't convert audio to canvas
    return;
  }

  // Convert canvas to blob and add to zip
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        zip.file(`${texturePath}.png`, blob);
      }
      resolve();
    }, "image/png");
  });
}

function generateMcMetaContent(animation: any): string {
  const mcMeta = {
    animation: {
      interpolate: animation.interpolate,
      frames: animation.frames.map((frame: any) => ({
        index: frame.index,
        time: frame.frameTime
      }))
    }
  };
  
  return JSON.stringify(mcMeta, null, 2);
}
