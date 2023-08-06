import * as React from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { ContextualMenu } from '@fluentui/react/lib/ContextualMenu';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { useBoolean } from '@fluentui/react-hooks';
import { Stack, TextField } from '@fluentui/react';
import * as connections from '../services/connections';

const modalPropsStyles = { main: { maxWidth: 450 } };
const dialogContentProps = {
  type: DialogType.largeHeader,
  title: 'settings',
  subText: 'manage account and client settings.',
};

export const SettingsDlgBtn = (props: { refreshBalance: Function }) => {
  const [hideDialog, { toggle: toggleHideDialog }] = useBoolean(true);
  const [isRemember, { toggle: toggleIsRemember }] = useBoolean(false);
  const [settings, setSettings] = React.useState({ username: '' });

  const modalProps = React.useMemo(
    () => ({
      isBlocking: true,
      styles: modalPropsStyles,
    }),
    [isRemember],
  );

  const onConfirmSettings = () => {
    connections.updateId(settings.username);
    props.refreshBalance();
  };

  return (
    <>
      <IconButton iconProps={{iconName: 'Settings'}} onClick={toggleHideDialog} text="settings" />
      <Dialog
        hidden={hideDialog}
        onDismiss={toggleHideDialog}
        dialogContentProps={dialogContentProps}
        modalProps={modalProps}
      >
        <Stack>
          <TextField
            label="username"
            value={settings.username}
            onChange={(e, v) => {
              setSettings({ ...settings, username: v as string })
            }}
            placeholder="@username"
            description="..cannot change for 14 days"
            required
          />
          {/* <SpinButton
            label="amount x$"
            value={transaction.amount}
            onChange={(e, v) => {
              setTransaction({ ...transaction, amount: v as string });
            }}
            min={0.01}
            max={1000}
            step={0.01}
            incrementButtonAriaLabel="Increase value by 0.1"
            decrementButtonAriaLabel="Decrease value by 0.1"
            style={{ width: '100%' }}
          />
          <TextField
            label="message"
            placeholder="Optional"
            value={transaction.message}
            onChange={(e, v) => {
              setTransaction({ ...transaction, message: v as string });
            }}
          /> */}
          <Toggle label="Remember" onChange={toggleIsRemember} checked={isRemember} />
        </Stack>
        <DialogFooter>
          <PrimaryButton onClick={() => {
            toggleHideDialog();
            onConfirmSettings();
            }} text="Confirm" />
          <DefaultButton onClick={toggleHideDialog} text="Explore" />
        </DialogFooter>
      </Dialog>
    </>
  );
};
