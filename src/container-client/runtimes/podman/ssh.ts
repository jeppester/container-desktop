import { AbstractClientEngineSSH } from "@/container-client/runtimes/abstract/ssh";
import { coercePodmanMachines } from "@/container-client/shared";
import { ApiConnection, Connection, ContainerEngine, ContainerRuntime, OperatingSystem } from "@/env/Types";
import { getWindowsPipePath } from "@/platform";
import { PODMAN_PROGRAM } from "../../connection";

export class PodmanClientEngineSSH extends AbstractClientEngineSSH {
  static ENGINE = ContainerEngine.PODMAN_REMOTE;
  ENGINE = ContainerEngine.PODMAN_REMOTE;
  PROGRAM = PODMAN_PROGRAM;
  RUNTIME = ContainerRuntime.PODMAN;

  static async create(id: string, osType: OperatingSystem) {
    const instance = new PodmanClientEngineSSH(osType);
    instance.id = id;
    await instance.setup();
    return instance;
  }

  async getApiConnection(): Promise<ApiConnection> {
    const settings = await this.getSettings();
    const scope = settings.controller?.scope;
    if (!scope) {
      this.logger.error(this.id, "getApiConnection requires a scope");
      return {
        uri: "",
        relay: undefined
      };
    }
    let connection = "";
    if (this.osType === OperatingSystem.Windows) {
      connection = getWindowsPipePath(scope);
    }
    return {
      uri: connection,
      relay: undefined
    };
  }

  // System information
  async getSystemInfo(connection?: Connection, customFormat?: string) {
    return super.getSystemInfo(connection, customFormat || "json");
  }

  isScoped() {
    return true;
  }

  async getPodmanMachines(customFormat?: string) {
    this.logger.debug(this.id, "getMachines with program");
    const settings = await this.getSettings();
    const commandLauncher = settings.program?.path || settings.program?.name || "";
    const commandArgs = ["machine", "list", "--format", customFormat || "json"];
    const result = await this.runScopeCommand(commandLauncher, commandArgs, settings?.controller?.scope || "");
    const items = coercePodmanMachines(result);
    return items;
  }
}
