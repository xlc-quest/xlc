import * as React from 'react';
import {
  mergeStyleSets,
  FocusTrapCallout,
  FocusZone,
  FocusZoneTabbableElements,
  FontWeights,
  Stack,
  Text,
} from '@fluentui/react';
import { useBoolean, useId } from '@fluentui/react-hooks';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';

export const SendCalloutBtn: React.FunctionComponent = () => {
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const buttonId = useId('callout-button');

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
          <Text block variant="small">
            Content is wrapped in a FocusTrapZone so the user cannot accidentally tab or focus out of this callout. Use
            the buttons to close.
          </Text>
          {/* This FocusZone allows the user to go between buttons with the arrow keys.
              It's not related to or required for FocusTrapCallout's built-in focus trapping. */}
          <FocusZone handleTabKey={FocusZoneTabbableElements.all} isCircularNavigation>
            <Stack className={styles.buttons} gap={8} horizontal>
              <PrimaryButton onClick={toggleIsCalloutVisible}>Confirm</PrimaryButton>
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
