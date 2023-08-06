import * as React from 'react';
import {
  mergeStyleSets,
  Panel,
  FocusZone,
  FocusZoneTabbableElements,
  FontWeights,
  Stack,
  Text,
  SpinButton,
  TextField,
  FontSizes,
} from '@fluentui/react';
import { useBoolean, useId } from '@fluentui/react-hooks';
import { ActionButton, DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import axios from 'axios';
import { configs } from '../../configs';
import { client } from '../services/connections';

export const SendCalloutBtn = (props: { refreshTransactionsAsync: Function }) => {
  const [isPanelVisible, { toggle: toggleIsPanelVisible }] = useBoolean(false);
  const buttonId = useId('callout-button');

  const [transaction, setTransaction] = React.useState({ from: '@xlcdev', to: '@xlcdevs', amount: '0.01', message: '' });

  const onConfirmSend = () => {
    transaction.from = client.id;
    
    axios
		.post(`${configs.url}/transactions?id=client`, transaction)
		.then((res) => {
      props.refreshTransactionsAsync();
		});
  };

  const onRenderFooterContent = React.useCallback(
    () => (
      <div>
        <PrimaryButton onClick={()=>{toggleIsPanelVisible(); onConfirmSend()}}>
          Confirm
        </PrimaryButton>
        <DefaultButton onClick={toggleIsPanelVisible}>Cancel</DefaultButton>
      </div>
    ),
    [isPanelVisible, transaction],
  );

  return (
    <>
      <PrimaryButton iconProps={{iconName: 'Send'}} id={buttonId} onClick={toggleIsPanelVisible} text="send" />
      <Panel
        isOpen={isPanelVisible}
        role="alertdialog"
        onDismiss={toggleIsPanelVisible}
        headerText='create new transaction'
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
      >
        <Text block variant="small" className={styles.title}>
          ..sending as '<b style={{ color: 'purple' }}>{client.id}</b>'. minimum cost to create a transaction is 'x$0.01'.
        </Text>
        <Stack>
          <TextField
            label="username"
            name="to"
            value={transaction.to}
            onChange={(e, v) => {
              setTransaction({ ...transaction, to: v as string });
            }}
            placeholder="@username"
            description="Support our devs :)?"
            required
          />
          <SpinButton
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
          />
        </Stack>
      </Panel>
    </>
  );
};

const styles = mergeStyleSets({
  callout: {
    width: 320,
    padding: '20px 24px',
  },
  title: {
    marginBottom: 12
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
});
