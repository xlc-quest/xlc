import * as React from 'react';
import { useBoolean, useSetInterval } from '@fluentui/react-hooks';

import { useId, Text } from "@fluentui/react-components";
import { Stack, Label, TextField, Alignment, IStackStyles, IStackTokens, IStackItemStyles, StackItem, updateT, Icon } from '@fluentui/react';
import { DetailsList, DetailsListLayoutMode, Selection, SelectionMode, IColumn } from '@fluentui/react/lib/DetailsList';
import { MarqueeSelection } from '@fluentui/react/lib/MarqueeSelection';
import { NeutralColors } from '@fluentui/theme';
import { DefaultPalette } from '@fluentui/react/lib/Styling';
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';

import axios from 'axios';
import { useState, useEffect, Dispatch, createContext, useContext } from 'react';
import { SendCalloutBtn } from './SendPanelBtn';
import { configs } from '../../configs';
import * as connections from '../services/connections';
import { SettingsDlgBtn } from './SettingsDlgBtn';

// Styles definition
const stackStyles: IStackStyles = {
	root: {
	//   background: DefaultPalette.themeTertiary,
	},
};

const verticalGapStackTokens: IStackTokens = {
  childrenGap: 10,
  padding: 10,
};

const setClientFunc: Function = () => {};
export const ConnectionsContext = createContext({
    client: connections.client,
    setClient: setClientFunc
});

//const transactions = [];
const App = (props: AppProps) => {
	const [transactions, setTransactions] = useState<any[]>([]);
	const [client, setClient] = useState(connections.client);

	const columns = [
		{ key: 'id', name: 'transaction#', fieldName: 'id', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'time', name: 'time', fieldName: 'time', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'from', name: 'from', fieldName: 'from', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'to', name: 'to', fieldName: 'to', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'amount', name: 'amount', fieldName: 'amount', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'message', name: 'message', fieldName: 'message', minWidth: 100, maxWidth: 200, isResizable: true },
	];

	const refreshTransactionsAsync = () => {
		axios
		.get(`${configs.url}/transactions?id=client`)
		.then((res) => {
			if (res.data.length <= 0) return;
			setTransactions((prevList) => {
				const updatedTransactions = [...res.data.reverse()];
				const balance = updatedTransactions.reduce((sum, t) =>  sum += Number(t.amount), 0);
				connections.client.balance = balance;
				return updatedTransactions;
			});
		});
	}

	const _onClickRefresh = () => {
		refreshTransactionsAsync();
	}

	useEffect(() => {
		refreshTransactionsAsync();
		connections.start(setClient);
	}, []);

	return (
	<ConnectionsContext.Provider value={{ client, setClient }}>
		<Stack enableScopedSelectors styles={stackStyles} tokens={verticalGapStackTokens}>
			<h1 style={{ fontSize:'24px', lineHeight:'24px', textAlign:'right', margin: 0, padding: 0, color: NeutralColors.gray120 }}>..xlc</h1>
			<Stack horizontal horizontalAlign='end' style={{color:'gray'}}>
				<Text size={100}>..{client.ip}</Text>
				<Text size={100}>{client.id}</Text>
				<Text size={100}>..connected to: {client.connections[0].url}/{client.connections.length}..</Text>
			</Stack>
			<Stack horizontal horizontalAlign='end'>
				<Text size={900}><small>x$</small>{client.balance.toFixed(4)}</Text>
			</Stack>
			<Stack horizontal horizontalAlign='end'>
				<IconButton iconProps={{iconName: 'Refresh'}} text="refresh" onClick={_onClickRefresh} />
				<SettingsDlgBtn></SettingsDlgBtn>
				<SendCalloutBtn refreshTransactionsAsync={refreshTransactionsAsync} />
			</Stack>
			<Stack>
				<DetailsList
						items={transactions}
						columns={columns}
						selectionMode={SelectionMode.none}
						layoutMode={DetailsListLayoutMode.justified}
						ariaLabelForSelectionColumn="Toggle selection"
						ariaLabelForSelectAllCheckbox="Toggle selection for all items"
						checkButtonAriaLabel="select row"
				/>
			</Stack>
		</Stack>
	</ConnectionsContext.Provider>
	);
};

interface AppProps {}
export default App;
