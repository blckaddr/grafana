import React, { useCallback, useState } from 'react';
import { Button, HorizontalGroup, Icon, Input, Modal, stylesFactory, useStyles } from '@grafana/ui';
import { GrafanaTheme } from '@grafana/data';
import { css } from 'emotion';
import { useAsync, useDebounce } from 'react-use';
import { getBackendSrv } from 'app/core/services/backend_srv';
import { usePanelSave } from '../../utils/usePanelSave';
import { getLibraryPanelConnectedDashboards } from '../../state/api';
import { PanelModelWithLibraryPanel } from '../../types';

interface Props {
  panel: PanelModelWithLibraryPanel;
  folderId: number;
  isOpen: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  onDiscard: () => void;
}

export const SaveLibraryPanelModal: React.FC<Props> = ({
  panel,
  folderId,
  isOpen,
  onDismiss,
  onConfirm,
  onDiscard,
}) => {
  const [searchString, setSearchString] = useState('');
  const connectedDashboardsState = useAsync(async () => {
    const connectedDashboards = await getLibraryPanelConnectedDashboards(panel.libraryPanel.uid);
    return connectedDashboards;
  }, []);

  const dashState = useAsync(async () => {
    const connectedDashboards = connectedDashboardsState.value;
    if (connectedDashboards && connectedDashboards.length > 0) {
      const dashboardDTOs = await getBackendSrv().search({ dashboardIds: connectedDashboards });
      return dashboardDTOs.map((dash) => dash.title);
    }

    return [];
  }, [connectedDashboardsState.value]);

  const [filteredDashboards, setFilteredDashboards] = useState<string[]>([]);
  useDebounce(
    () => {
      if (!dashState.value) {
        return setFilteredDashboards([]);
      }

      return setFilteredDashboards(
        dashState.value.filter((dashName) => dashName.toLowerCase().includes(searchString.toLowerCase()))
      );
    },
    300,
    [dashState.value, searchString]
  );

  const { saveLibraryPanel } = usePanelSave();
  const styles = useStyles(getModalStyles);
  const discardAndClose = useCallback(() => {
    onDiscard();
    onDismiss();
  }, []);

  return (
    <Modal title="Update all panel instances" icon="save" onDismiss={onDismiss} isOpen={isOpen}>
      <div>
        <p className={styles.textInfo}>
          {'This update will affect '}
          <strong>
            {panel.libraryPanel.meta.connectedDashboards}{' '}
            {panel.libraryPanel.meta.connectedDashboards === 1 ? 'dashboard' : 'dashboards'}.
          </strong>
          The following dashboards using the panel will be affected:
        </p>
        <Input
          className={styles.dashboardSearch}
          prefix={<Icon name="search" />}
          placeholder="Search affected dashboards"
          value={searchString}
          onChange={(e) => setSearchString(e.currentTarget.value)}
        />
        {dashState.loading ? (
          <p>Loading connected dashboards...</p>
        ) : (
          <table className={styles.myTable}>
            <thead>
              <tr>
                <th>Dashboard name</th>
              </tr>
            </thead>
            <tbody>
              {filteredDashboards.map((dashName, i) => (
                <tr key={`dashrow-${i}`}>
                  <td>{dashName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <HorizontalGroup>
          <Button
            onClick={() => {
              saveLibraryPanel(panel, folderId).then(() => {
                onConfirm();
                onDismiss();
              });
            }}
          >
            Update all
          </Button>
          <Button variant="destructive" onClick={discardAndClose}>
            Discard
          </Button>
          <Button variant="secondary" onClick={onDismiss}>
            Cancel
          </Button>
        </HorizontalGroup>
      </div>
    </Modal>
  );
};

const getModalStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    myTable: css`
      max-height: 204px;
      overflow-y: auto;
      margin-top: 11px;
      margin-bottom: 28px;
      border-radius: ${theme.border.radius.sm};
      border: 1px solid ${theme.colors.bg3};
      background: ${theme.colors.bg1};
      color: ${theme.colors.textSemiWeak};
      font-size: ${theme.typography.size.md};
      width: 100%;

      thead {
        color: #538ade;
        font-size: ${theme.typography.size.sm};
      }

      th,
      td {
        padding: 6px 13px;
        height: ${theme.spacing.xl};
      }

      tbody > tr:nth-child(odd) {
        background: ${theme.colors.bg2};
      }
    `,
    noteTextbox: css`
      margin-bottom: ${theme.spacing.xl};
    `,
    textInfo: css`
      color: ${theme.colors.textSemiWeak};
      font-size: ${theme.typography.size.sm};
    `,
    dashboardSearch: css`
      margin-top: ${theme.spacing.md};
    `,
  };
});
