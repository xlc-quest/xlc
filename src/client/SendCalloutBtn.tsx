import * as React from 'react';
import {
  mergeStyleSets,
  FocusTrapCallout,
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
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import axios from 'axios';
import { FormEvent } from 'react';
import { configs } from '../configs';

export const SendCalloutBtn = (props: { refreshTransactionsAsync: Function }) => {
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const [amount, setAmount] = React.useState('0.00');
  const buttonId = useId('callout-button');

  const [transaction, setTransaction] = React.useState({ from: '@xlcdev', to: '@xlcdevs', amount: '0.01', message: '' });

  const onConfirmSend = () => {
    // axios
		// .post(`http://localhost:3000/transactions?id=client`, {
		// 	from: `from#${(Math.random()*1000).toFixed(0)}`,
		// 	to: `to#${(Math.random()*1000).toFixed(0)}`,
		// 	amount: (Math.random()*10).toFixed(4),
		// 	message: "Test Transaction"
		// })
		// .then((res) => {
		// });

    //console.log(t);

    axios
		.post(`${configs.url}/transactions?id=client`, transaction)
		.then((res) => {
      props.refreshTransactionsAsync();
		});
  };

  return (
    <>
      <PrimaryButton id={buttonId} onClick={toggleIsCalloutVisible} text="send" />
      {isCalloutVisible ? (
        <FocusTrapCallout
          role="alertdialog"
          className={styles.callout}
          gapSpace={0}
          target={`#${buttonId}`}
          onDismiss={toggleIsCalloutVisible}
          setInitialFocus
        >
          <Text block variant="xLarge" className={styles.title}>
            create new transaction
          </Text>
          <Text block variant="small" className={styles.title}>
            minimum cost to create a transaction is 'x$0.01'.
          </Text>
          {/* This FocusZone allows the user to go between buttons with the arrow keys.
              It's not related to or required for FocusTrapCallout's built-in focus trapping. */}
          <FocusZone handleTabKey={FocusZoneTabbableElements.all} isCircularNavigation>
            <Stack>
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
              
            </Stack>
            <Stack className={styles.buttons} horizontal>
              <PrimaryButton onClick={() => {
                toggleIsCalloutVisible();
                onConfirmSend();
              }}>Confirm</PrimaryButton>
              <DefaultButton onClick={toggleIsCalloutVisible}>Cancel</DefaultButton>
            </Stack>
          </FocusZone>
        </FocusTrapCallout>
      ) : null}
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
