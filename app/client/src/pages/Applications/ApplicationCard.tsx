import React, {
  useEffect,
  useState,
  useRef,
  useContext,
  useCallback,
  useMemo,
} from "react";
import styled, { ThemeContext } from "styled-components";
import type { HTMLDivProps, ICardProps } from "@blueprintjs/core";
import { Card, Classes } from "@blueprintjs/core";
import type { ApplicationPayload } from "@appsmith/constants/ReduxActionConstants";
import {
  hasDeleteApplicationPermission,
  isPermitted,
  PERMISSION_TYPE,
} from "@appsmith/utils/permissionHelpers";
import {
  getInitialsAndColorCode,
  getApplicationIcon,
  getRandomPaletteColor,
} from "utils/AppsmithUtils";
import { noop, omit } from "lodash";
import type { AppIconName } from "design-system-old";
import {
  AppIcon,
  ColorSelector,
  EditableText,
  EditInteractionKind,
  IconSelector,
  SavingState,
  Size,
  Text,
  TextType,
} from "design-system-old";
import type { MenuItemProps } from "design-system";
import {
  Button,
  Icon,
  Menu,
  Divider,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Tooltip,
} from "design-system";
import { useDispatch, useSelector } from "react-redux";
import type {
  ApplicationPagePayload,
  UpdateApplicationPayload,
} from "@appsmith/api/ApplicationApi";
import {
  getIsFetchingApplications,
  getIsSavingAppName,
  getIsErroredSavingAppName,
} from "@appsmith/selectors/applicationSelectors";
import { truncateString, howMuchTimeBeforeText } from "utils/helpers";
import ForkApplicationModal from "./ForkApplicationModal";
import { getExportAppAPIRoute } from "@appsmith/constants/ApiConstants";
import { CONNECTED_TO_GIT, createMessage } from "@appsmith/constants/messages";
import { builderURL, viewerURL } from "RouteBuilder";
import history from "utils/history";
import urlBuilder from "entities/URLRedirect/URLAssembly";
import { toast } from "design-system";
import { getAppsmithConfigs } from "@appsmith/configs";
import { addItemsInContextMenu } from "@appsmith/utils";
import { getCurrentUser } from "actions/authActions";

const { cloudHosting } = getAppsmithConfigs();

type NameWrapperProps = {
  hasReadPermission: boolean;
  showOverlay: boolean;
  isMenuOpen: boolean;
};

const NameWrapper = styled((props: HTMLDivProps & NameWrapperProps) => (
  <div {...omit(props, ["hasReadPermission", "showOverlay", "isMenuOpen"])} />
))`
  .bp3-card {
    border-radius: var(--ads-v2-border-radius);
    box-shadow: none;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  ${(props) =>
    props.showOverlay &&
    `
      {
        justify-content: center;
        align-items: center;

        .overlay {
          position: relative;
          border-radius: var(--ads-v2-border-radius);
          ${
            props.hasReadPermission &&
            `text-decoration: none;
             &:after {
                left: 0;
                top: 0;
                content: "";
                position: absolute;
                height: 100%;
                width: 100%;
              }
              & .control {
                display: flex;
                flex-direction: row;
                z-index: 1;
              }`
          }

          & div.overlay-blur {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: ${
              props.hasReadPermission && !props.isMenuOpen
                ? `rgba(255, 255, 255, 0.5)`
                : null
            };
            border-radius: var(--ads-v2-border-radius);
            @supports ((-webkit-backdrop-filter: none) or (backdrop-filter: none)) {
              background-color: transparent;
              backdrop-filter: ${
                props.hasReadPermission && !props.isMenuOpen
                  ? `blur(6px)`
                  : null
              };
            }
          }
        }
      }
   `}
  overflow: hidden;
`;

const Wrapper = styled(
  (
    props: ICardProps & {
      hasReadPermission?: boolean;
      backgroundColor: string;
      isMobile?: boolean;
    },
  ) => (
    <Card
      {...omit(props, ["hasReadPermission", "backgroundColor", "isMobile"])}
    />
  ),
)`
  display: flex;
  flex-direction: row-reverse;
  justify-content: center;
  width: ${(props) => props.theme.card.minWidth}px;
  height: ${(props) => props.theme.card.minHeight}px;
  position: relative;
  background-color: ${(props) => props.backgroundColor};
  border-radius: var(--ads-v2-border-radius);
  .overlay {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    ${(props) => !props.hasReadPermission && `pointer-events: none;`}
  }
  .bp3-card {
    border-radius: var(--ads-v2-border-radius);
  }
  }

  ${({ isMobile }) =>
    isMobile &&
    `
    width: 100% !important;
    height: 126px !important;
  `}
`;

const ApplicationImage = styled.div`
  && {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

const Control = styled.div<{ fixed?: boolean }>`
  outline: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 8px;
  align-items: center;

  .${Classes.BUTTON} {
    margin-top: 7px;

    div {
      width: auto;
      height: auto;
    }
  }

  .${Classes.BUTTON_TEXT} {
    font-size: 12px;
    color: white;
  }

  .more {
    position: absolute;
    right: ${(props) => props.theme.spaces[6]}px;
    top: ${(props) => props.theme.spaces[4]}px;
  }
`;

const AppNameWrapper = styled.div<{ isFetching: boolean }>`
  padding: 0;
  padding-right: 12px;
  ${(props) =>
    props.isFetching
      ? `
    width: 119px;
    height: 16px;
    margin-left: 10px;
  `
      : null};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3; /* number of lines to show */
  -webkit-box-orient: vertical;
  word-break: break-word;
  color: ${(props) => props.theme.colors.text.heading};
  flex: 1;

  .bp3-popover-target {
    display: inline;
  }
`;

type ApplicationCardProps = {
  application: ApplicationPayload;
  share?: (applicationId: string) => void;
  delete?: (applicationId: string) => void;
  update?: (id: string, data: UpdateApplicationPayload) => void;
  enableImportExport?: boolean;
  isMobile?: boolean;
  permissions?: {
    hasCreateNewApplicationPermission?: boolean;
    hasManageWorkspacePermissions?: boolean;
    canInviteToWorkspace?: boolean;
  };
  workspaceId: string;
};

const CircleAppIcon = styled(AppIcon)`
  padding: 12px;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px 2px 16px rgba(0, 0, 0, 0.07);
  border-radius: 50%;

  svg {
    width: 100%;
    height: 100%;
    path {
      fill: var(--ads-v2-color-fg);
    }
  }
`;

const ModifiedDataComponent = styled.div`
  font-size: 13px;
  color: var(--ads-v2-color-fg-muted);
  &::first-letter {
    text-transform: uppercase;
  }
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
`;

const IconScrollWrapper = styled.div`
  position: relative;
  .t--icon-selected {
    background-color: var(--ads-v2-color-bg-muted);
    border: var(--ads-v2-border-color);
    svg {
      path {
        fill: var(--ads-v2-color-fg);
      }
    }
  }
  svg {
    path {
      fill: var(--ads-v2-color-fg);
    }
  }
`;

const StyledGitConnectedBadge = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: -12px;
  right: -12px;
  box-shadow: 0px 2px 16px rgba(0, 0, 0, 0.07);
  background: var(--ads-v2-color-bg);
`;

function GitConnectedBadge() {
  return (
    <StyledGitConnectedBadge>
      <Tooltip content={createMessage(CONNECTED_TO_GIT)}>
        <Icon name="fork" size="md" />
      </Tooltip>
    </StyledGitConnectedBadge>
  );
}

const Container = styled.div<{ isMobile?: boolean }>`
  position: relative;
  overflow: visible;
  ${({ isMobile }) => isMobile && `width: 100%;`}
`;

type ModifiedMenuItemProps = MenuItemProps & {
  key?: string;
  "data-testid"?: string;
};

export function ApplicationCard(props: ApplicationCardProps) {
  const isFetchingApplications = useSelector(getIsFetchingApplications);
  const theme = useContext(ThemeContext);
  const isSavingName = useSelector(getIsSavingAppName);
  const isErroredSavingName = useSelector(getIsErroredSavingAppName);
  const initialsAndColorCode = getInitialsAndColorCode(
    props.application.name,
    theme.colors.appCardColors,
  );
  let initials = initialsAndColorCode[0];
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [moreActionItems, setMoreActionItems] = useState<
    ModifiedMenuItemProps[]
  >([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isForkApplicationModalopen, setForkApplicationModalOpen] =
    useState(false);
  const [lastUpdatedValue, setLastUpdatedValue] = useState("");
  const appNameWrapperRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  const applicationId = props.application?.id;
  const showGitBadge = props.application?.gitApplicationMetadata?.branchName;

  useEffect(() => {
    let colorCode;
    if (props.application.color) {
      colorCode = props.application.color;
    } else {
      colorCode = getRandomPaletteColor(theme.colors.appCardColors);
    }
    setSelectedColor(colorCode);
  }, [props.application.color]);

  useEffect(() => {
    if (props.share) {
      moreActionItems.push({
        onSelect: shareApp,
        children: "Share",
        key: "share",
        startIcon: "share",
        "data-testid": "t--share",
      });
    }
    // add fork app option to menu
    if (hasEditPermission) {
      moreActionItems.push({
        onSelect: forkApplicationInitiate,
        children: "Fork",
        key: "fork",
        startIcon: "fork-2",
        "data-testid": "t--fork-app",
      });
    }
    if (!!props.enableImportExport && hasExportPermission) {
      moreActionItems.push({
        onSelect: exportApplicationAsJSONFile,
        children: "Export",
        key: "export",
        startIcon: "download",
        "data-testid": "t--export-app",
      });
    }
    const updatedMoreActionItems: ModifiedMenuItemProps[] =
      addItemsInContextMenu(
        [
          props.permissions?.hasManageWorkspacePermissions || false,
          props.permissions?.canInviteToWorkspace || false,
          !cloudHosting,
        ],
        history,
        props.workspaceId,
        moreActionItems,
      );
    setMoreActionItems(updatedMoreActionItems);
    addDeleteOption();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appIcon = (props.application?.icon ||
    getApplicationIcon(applicationId)) as AppIconName;
  const hasEditPermission = isPermitted(
    props.application?.userPermissions ?? [],
    PERMISSION_TYPE.MANAGE_APPLICATION,
  );
  const hasReadPermission = isPermitted(
    props.application?.userPermissions ?? [],
    PERMISSION_TYPE.READ_APPLICATION,
  );
  const hasExportPermission = isPermitted(
    props.application?.userPermissions ?? [],
    PERMISSION_TYPE.EXPORT_APPLICATION,
  );
  const hasDeletePermission = hasDeleteApplicationPermission(
    props.application?.userPermissions,
  );

  const updateColor = (color: string) => {
    setSelectedColor(color);
    props.update &&
      props.update(applicationId, {
        color: color,
      });
  };
  const updateIcon = (icon: AppIconName) => {
    props.update &&
      props.update(applicationId, {
        icon: icon,
      });
  };
  const shareApp = () => {
    props.share && props.share(applicationId);
  };
  const exportApplicationAsJSONFile = () => {
    // export api response comes with content-disposition header.
    // there is no straightforward way to handle it with axios/fetch
    const id = `t--export-app-link`;
    const existingLink = document.getElementById(id);
    existingLink && existingLink.remove();
    const link = document.createElement("a");

    const branchName = props.application.gitApplicationMetadata?.branchName;
    link.href = getExportAppAPIRoute(applicationId, branchName);
    link.id = id;
    document.body.appendChild(link);
    // @ts-expect-error: Types are not available
    if (!window.Cypress) {
      link.click();
    }
    setIsMenuOpen(false);
    toast.show(`Successfully exported ${props.application.name}`, {
      kind: "success",
    });
  };
  const forkApplicationInitiate = () => {
    // open fork application modal
    // on click on an workspace, create app and take to app
    setForkApplicationModalOpen(true);
  };
  const deleteApp = () => {
    setShowOverlay(false);
    props.delete && props.delete(applicationId);
  };
  const askForConfirmation = () => {
    setIsDeleting(true);
    const updatedActionItems = [...moreActionItems];
    updatedActionItems.pop();
    updatedActionItems.push({
      onSelect: deleteApp,
      children: "Are you sure?",
      key: "areyousure",
      startIcon: "delete-bin-line",
      "data-testid": "t--delete",
    });
    setMoreActionItems(updatedActionItems);
  };
  const addDeleteOption = () => {
    if (props.delete && hasDeletePermission) {
      const index = moreActionItems.findIndex(
        (el) => el.startIcon === "delete-bin-line",
      );
      if (index >= 0) {
        moreActionItems.pop();
      }
      moreActionItems.push({
        onSelect: askForConfirmation,
        children: "Delete",
        key: "delete",
        startIcon: "delete-bin-line",
        "data-testid": "t--delete-confirm",
      });
      setMoreActionItems(moreActionItems);
    }
  };

  if (initials.length < 2 && props.application.name.length > 1) {
    initials += props.application.name[1].toUpperCase() || "";
  }

  // should show correct branch of application when edit mode
  const params: any = {};
  if (showGitBadge) {
    params.branch = showGitBadge;
  }

  const appNameText = (
    <Text data-testid="t--app-card-name" type={TextType.H3}>
      {props.application.name}
    </Text>
  );

  const handleMenuOnClose = (open: boolean) => {
    if (!open && !isDeleting) {
      setIsMenuOpen(false);
      setShowOverlay(false);
      addDeleteOption();
      if (lastUpdatedValue && props.application.name !== lastUpdatedValue) {
        props.update &&
          props.update(applicationId, {
            name: lastUpdatedValue,
          });
      }
    } else {
      setIsMenuOpen(true);
      setIsDeleting(false);
    }
  };

  const ContextMenu = (
    <>
      <Menu className="more" onOpenChange={handleMenuOnClose} open={isMenuOpen}>
        <MenuTrigger>
          <Button
            className="m-0.5"
            data-testid="t--application-card-context-menu"
            isIconButton
            kind="tertiary"
            size="sm"
            startIcon="context-menu"
          />
        </MenuTrigger>
        <MenuContent side="right" style={{ maxHeight: "unset" }}>
          {hasEditPermission && (
            <div
              onKeyDown={(e) => {
                // This is to prevent the Menu component to take focus away from the input
                // https://github.com/radix-ui/primitives/issues/1175
                e.stopPropagation();
              }}
            >
              <EditableText
                className="px-3 pt-2 pb-2 t--application-name"
                defaultValue={props.application.name}
                editInteractionKind={EditInteractionKind.SINGLE}
                fill
                hideEditIcon={false}
                isError={isErroredSavingName}
                isInvalid={(value: string) => {
                  if (!value) {
                    return "Name cannot be empty";
                  } else {
                    return false;
                  }
                }}
                onBlur={(value: string) => {
                  props.update &&
                    props.update(applicationId, {
                      name: value,
                    });
                }}
                onTextChanged={(value: string) => {
                  setLastUpdatedValue(value);
                }}
                placeholder={"Edit text input"}
                savingState={
                  isSavingName ? SavingState.STARTED : SavingState.NOT_STARTED
                }
                underline
              />
            </div>
          )}
          {hasEditPermission && (
            <>
              <ColorSelector
                colorPalette={theme.colors.appCardColors}
                defaultValue={selectedColor}
                fill
                onSelect={updateColor}
              />
              <Divider />
            </>
          )}
          {hasEditPermission && (
            <IconScrollWrapper>
              <IconSelector
                className="icon-selector"
                fill
                onSelect={updateIcon}
                selectedColor={theme.colors.applications.cardMenuIcon}
                selectedIcon={appIcon}
              />
              <Divider />
            </IconScrollWrapper>
          )}
          <div className="menu-items-wrapper">
            {moreActionItems.map((item: MenuItemProps) => {
              const { children, key, ...restMenuItem } = item;
              return (
                <MenuItem
                  {...restMenuItem}
                  className={
                    item.startIcon === "delete-bin-line" ? "error-menuitem" : ""
                  }
                  key={key}
                >
                  {children}
                </MenuItem>
              );
            })}
          </div>
        </MenuContent>
      </Menu>
      <ForkApplicationModal
        applicationId={applicationId}
        isModalOpen={isForkApplicationModalopen}
        setModalClose={setForkApplicationModalOpen}
      />
    </>
  );

  const editedByText = () => {
    let editedBy = props.application.modifiedBy
      ? props.application.modifiedBy
      : "";
    let editedOn = props.application.modifiedAt
      ? props.application.modifiedAt
      : "";

    if (editedBy === "" && editedOn === "") return "";

    editedBy = editedBy.split("@")[0];
    editedBy = truncateString(editedBy, 9);

    //assuming modifiedAt will be always available
    editedOn = howMuchTimeBeforeText(editedOn);
    editedOn = editedOn !== "" ? editedOn + " ago" : "";
    return editedBy + " edited " + editedOn;
  };

  function setURLParams() {
    const page: ApplicationPagePayload | undefined =
      props.application.pages.find(
        (page) => page.id === props.application.defaultPageId,
      );
    if (!page) return;
    urlBuilder.updateURLParams(
      {
        applicationSlug: props.application.slug,
        applicationVersion: props.application.applicationVersion,
        applicationId: props.application.id,
      },
      props.application.pages.map((page) => ({
        pageSlug: page.slug,
        customSlug: page.customSlug,
        pageId: page.id,
      })),
    );
  }

  const editModeURL = useMemo(() => {
    if (!props.application.defaultPageId) return "";
    return builderURL({
      pageId: props.application.defaultPageId,
      params,
    });
  }, [props.application.defaultPageId, params]);

  const viewModeURL = useMemo(() => {
    if (!props.application.defaultPageId) return "";
    return viewerURL({
      pageId: props.application.defaultPageId,
      params,
    });
  }, [props.application.defaultPageId, params]);

  const launchApp = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setURLParams();
      history.push(
        viewerURL({
          pageId: props.application.defaultPageId,
          params,
        }),
      );
      dispatch(getCurrentUser());
    },
    [props.application.defaultPageId],
  );

  const editApp = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setURLParams();
      history.push(
        builderURL({
          pageId: props.application.defaultPageId,
          params,
        }),
      );
      dispatch(getCurrentUser());
    },
    [props.application.defaultPageId],
  );

  return (
    <Container
      isMobile={props.isMobile}
      onClick={props.isMobile ? launchApp : noop}
    >
      <NameWrapper
        className="t--application-card"
        hasReadPermission={hasReadPermission}
        isMenuOpen={isMenuOpen}
        onMouseEnter={() => {
          !isFetchingApplications && setShowOverlay(true);
        }}
        onMouseLeave={() => {
          // If the menu is not open, then setOverlay false
          // Set overlay false on outside click.
          !isMenuOpen && setShowOverlay(false);
        }}
        showOverlay={showOverlay}
      >
        <Wrapper
          backgroundColor={selectedColor}
          className={
            isFetchingApplications
              ? Classes.SKELETON
              : "t--application-card-background"
          }
          hasReadPermission={hasReadPermission}
          isMobile={props.isMobile}
          key={props.application.id}
        >
          <CircleAppIcon name={appIcon} size={Size.large} />
          <AppNameWrapper
            className={isFetchingApplications ? Classes.SKELETON : ""}
            isFetching={isFetchingApplications}
            ref={appNameWrapperRef}
          >
            {appNameText}
          </AppNameWrapper>
          {showOverlay && !props.isMobile && (
            <div className="overlay">
              <div className="overlay-blur" />
              <ApplicationImage className="image-container">
                <Control className="control">
                  {hasEditPermission && !isMenuOpen && (
                    <Button
                      className="t--application-edit-link"
                      href={editModeURL}
                      onClick={editApp}
                      size="md"
                      startIcon={"pencil-line"}
                    >
                      Edit
                    </Button>
                  )}
                  {!isMenuOpen && (
                    <Button
                      className="t--application-view-link"
                      href={viewModeURL}
                      kind="secondary"
                      onClick={launchApp}
                      size="md"
                      startIcon={"rocket"}
                    >
                      Launch
                    </Button>
                  )}
                </Control>
              </ApplicationImage>
            </div>
          )}
        </Wrapper>
        <CardFooter>
          <ModifiedDataComponent>{editedByText()}</ModifiedDataComponent>
          {!!moreActionItems.length && !props.isMobile && ContextMenu}
        </CardFooter>
      </NameWrapper>
      {showGitBadge && <GitConnectedBadge />}
    </Container>
  );
}

export default ApplicationCard;
