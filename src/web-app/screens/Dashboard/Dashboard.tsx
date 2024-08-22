import { AnchorButton, Button, FormGroup, HTMLTable, Icon, InputGroup, Intent, NonIdealState } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

// project
import { ContainerEngine, Platforms } from "../../Types.container-app";

// module
import { CONTAINER_DOCS_EXAMPLE_CODE, CONTAINER_DOCS_URL } from "../../Environment";
import { usePoller } from "../../Hooks";
import { Native } from "../../Native";
import { Notification } from "../../Notification";
import { AppScreen, AppScreenProps } from "../../Types";
import { useStoreActions, useStoreState } from "../../domain/types";

// locals
import "./Dashboard.css";

export const ID = "dashboard";
export const Title = "Dashboard";

export interface ScreenProps extends AppScreenProps {}

export const Screen: AppScreen<ScreenProps> = () => {
  const { t } = useTranslation();
  const [osType, setOsType] = useState<string>("");
  const userSettings = useStoreState((state) => state.descriptor.userSettings);
  const containersFetchStats = useStoreActions((actions) => actions.dashboard.containersFetchStats);
  const containerStats = useStoreState((state) => state.dashboard.containerStats);
  const currentConnector = useStoreState((state) => state.descriptor.currentConnector);
  const engine = currentConnector.engine;
  const program = currentConnector.settings.current.program;
  const machine = currentConnector.settings.current.controller?.scope || "";

  const { exampleCode, commandPrefix, commandTitle } = useMemo(() => {
    const exampleCode = CONTAINER_DOCS_EXAMPLE_CODE.replace("{program}", program?.name || "podman");
    let commandPrefix;
    let commandTitle;
    if (osType === Platforms.Linux && engine === ContainerEngine.PODMAN_VIRTUALIZED && machine) {
      commandPrefix = `podman machine ssh ${machine}`;
      commandTitle = t(
        "On Linux, to dissociated between commands targeting the native podman engine, a machine prefix must be used."
      );
    } else if (osType === Platforms.Mac) {
      commandPrefix = `limactl shell podman`;
      commandTitle = t(
        "On MacOS, to dissociated between commands targeting the native podman engine, a limactl prefix must be used."
      );
    }
    return {
      exampleCode,
      commandPrefix,
      commandTitle
    };
  }, [t, engine, osType, machine, program]);

  const onCopyToClipboardClick = useCallback(
    async (e) => {
      await navigator.clipboard.writeText(exampleCode);
      Notification.show({ message: t("The command was copied to clipboard"), intent: Intent.SUCCESS });
    },
    [t, exampleCode]
  );

  // Change hydration
  usePoller({ poller: containersFetchStats });

  useEffect(() => {
    (async () => {
      const instance = await Native.getInstance();
      const osType = await instance.getOperatingSystem();
      setOsType(osType);
    })();
  }, [t]);

  return (
    <div className="AppScreen" data-screen={ID}>
      <div className="AppScreenContent">
        <NonIdealState
          icon={<Icon icon={IconNames.CUBE} size={120} />}
          title={t("containersRunning", { count: containerStats.running, context: `${containerStats.running}` })}
          description={
            <div className="AppScreenContentViewport">
              <HTMLTable className="DashboardContainersReportTable" striped compact bordered>
                <tbody>
                  <tr>
                    <td>{t("Paused")}</td>
                    <td>{containerStats.paused}</td>
                  </tr>
                  <tr>
                    <td>{t("Exited")}</td>
                    <td>{containerStats.exited}</td>
                  </tr>
                  <tr>
                    <td>{t("Created")}</td>
                    <td>{containerStats.created}</td>
                  </tr>
                </tbody>
              </HTMLTable>
              <p>{t("As an example, copy and paste this command into your terminal and then come back")}</p>
              <FormGroup helperText={commandPrefix ? commandPrefix : ""}>
                <InputGroup
                  title={commandTitle}
                  className="DashboardContainerExampleCode"
                  value={exampleCode}
                  readOnly
                  rightElement={<Button icon={IconNames.CLIPBOARD} onClick={onCopyToClipboardClick} />}
                />
              </FormGroup>
              <AnchorButton
                className="DashboardContainerDocsUrl"
                href={CONTAINER_DOCS_URL}
                target="_blank"
                minimal
                icon={IconNames.LINK}
                text={t("Explore more in the docs")}
                intent={Intent.PRIMARY}
              />
            </div>
          }
        />
      </div>
    </div>
  );
};

Screen.ID = ID;
Screen.Title = Title;
Screen.Route = {
  Path: "/"
};
Screen.Metadata = {
  LeftIcon: IconNames.DASHBOARD
};
