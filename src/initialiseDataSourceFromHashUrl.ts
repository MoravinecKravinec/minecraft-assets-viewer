import { GithubDataSource } from "./dataSource/GithubDataSource";
import { displayTexturesForDataSource } from "./ui/displayTexturesForDataSource";

export async function initialiseDataSourceFromHashUrl() {
  const parts = window.location.hash.split("/");

  if (parts[0] === "#github" && parts[1] && parts[2] && parts[3]) {
    const dataSource = new GithubDataSource(parts[1], parts[2], parts[3], "");
    (window as any).currentDataSource = dataSource;
    await displayTexturesForDataSource(dataSource);
  }
}
