import * as React from 'react';
import { useBoolean, useSetInterval } from '@fluentui/react-hooks';

import { useId, Text } from "@fluentui/react-components";
import { Stack, Label, TextField, Alignment, IStackStyles, IStackTokens, IStackItemStyles, StackItem, updateT, Icon } from '@fluentui/react';
import { DetailsList, DetailsListLayoutMode, Selection, SelectionMode, IColumn } from '@fluentui/react/lib/DetailsList';
import { MarqueeSelection } from '@fluentui/react/lib/MarqueeSelection';
import { NeutralColors } from '@fluentui/theme';
import { DefaultPalette } from '@fluentui/react/lib/Styling';
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';

import axios, { all } from 'axios';
import { useState, useEffect, Dispatch, createContext, useContext } from 'react';
import { SendCalloutBtn } from './SendPanelBtn';
import { configs } from '../configs';
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

interface Transaction {
	id?: string,
	time?: string,
	from?: string,
	to?: string,
	amount?: string,
	message?: string
}

//const transactions = [];
const App = (props: AppProps) => {
	const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
	const [filter, setFilter] = useState('');
	const [filteredTransactions, setFilteredTransactions] = useState<any[]>(allTransactions);
	const [client, setClient] = useState(connections.client);

	const columns = [
		{ key: 'id', name: 'transaction#', fieldName: 'id', 		minWidth: 50, maxWidth: 250, isResizable: true },
		{ key: 'time', name: 'time', fieldName: 'time', 			minWidth: 50, maxWidth: 150, isResizable: true },
		{ key: 'from', name: 'from', fieldName: 'from', 			minWidth: 50, maxWidth: 100, isResizable: true },
		{ key: 'to', name: 'to', fieldName: 'to', 					minWidth: 50, maxWidth: 100, isResizable: true },
		{ key: 'amount', name: 'amount', fieldName: 'amount', 		minWidth: 50, maxWidth: 80, isResizable: true },
		{ key: 'message', name: 'message', fieldName: 'message', 	minWidth: 200, maxWidth: 500, isResizable: true },
	];

	const refreshTransactionsAsync = () => {
		axios
		.get(`${configs.serverUrl}/transactions?id=${client.id}`)
		.then((res) => {
			if (res.data.length <= 0) return;
			connections.updateBalance(res.data);

			const transactions: Transaction[] = [];
			res.data.forEach((t: any) => {
				transactions.push({
					id: t.id,
					from: t.from,
					to: t.to,
					time: new Date(t.time).toLocaleString(),
					message: t.message,
					amount: 'x$'+Number(t.amount).toFixed(4)
				})
			});

			setAllTransactions(transactions.reverse());
			setFilteredTransactions(transactions);
		});
	}

	const refreshBalance = () => {
		connections.updateBalance(filteredTransactions);
	}

	const _onClickRefresh = () => {
		setFilter('');
		refreshTransactionsAsync();
	}

	useEffect(() => {
		connections.start(setClient);
		refreshTransactionsAsync();
	}, []);

	return (
	<ConnectionsContext.Provider value={{ client, setClient }}>
		<Stack enableScopedSelectors styles={stackStyles} tokens={verticalGapStackTokens} horizontalAlign='end'>
			<h1 style={{ fontSize:'24px', lineHeight:'24px', textAlign:'right', margin: 0, padding: 0, color: NeutralColors.gray120 }}>..xlc</h1>
			<Stack horizontal horizontalAlign='end' style={{color:'gray'}}>
				<Text size={100}>..<span style={{color: 'violet'}}>{client.ip}</span></Text>
				<Text size={100}><span style={client.id == '@loading..' ? {color: 'gray'} : {color: 'purple', fontWeight: 'bold'}}>{client.id}</span></Text>
				<Text size={100}>..connected to..
					<span style={client.connections?.length > 1 ? {fontWeight: 'bold', color: 'green'} : {fontWeight: 'normal', color: 'gray'}}>
					{client.connections?.length > 0 ? client.serverUrl : 'loading'}</span>..of..
					<span style={{fontWeight: 'bold', color: 'blue'}}>{client.connections?.length}</span>
				</Text>
			</Stack>
			<Stack horizontal horizontalAlign='end' style={{color:'gray'}}>
			<Text size={100}>..with..<span style={{color: 'orange', fontWeight: 'bold'}}>{client.influence ? (client.influence * 100).toFixed(2) : '0.00'}%</span> influence..</Text>
			</Stack>
			<Stack horizontal horizontalAlign='end'>
				<Text size={900}><small>x$</small>{client.balance.toFixed(4)}</Text>
			</Stack>
			<Stack horizontal horizontalAlign='end'>
				<IconButton iconProps={{iconName: 'Refresh'}} text="refresh" onClick={_onClickRefresh} />
				<SettingsDlgBtn refreshBalance={refreshBalance}></SettingsDlgBtn>
				<SendCalloutBtn refreshTransactionsAsync={refreshTransactionsAsync} />
			</Stack>
			
		{ allTransactions.length > 0 ? (
			<Stack horizontalAlign='end' style={{width:'100%'}}>
				<Stack horizontal horizontalAlign='end'>
					<Stack>
					</Stack>
					<Stack style={{ maxWidth:'400px' }}>
						<TextField
							placeholder='search for transaction#, from, to, amount, message'
							prefix='filter..'
							defaultValue={filter}
							size={200}
							onChange={((e, v) => {
								if (!v) {
									setFilteredTransactions(allTransactions);
								} else {
									setFilteredTransactions(allTransactions.filter(t =>
										t.id?.includes(v) ||
										t.from?.includes(v) ||
										t.to?.includes(v) ||
										t.amount?.includes(v) ||
										t.message?.includes(v)));
								}

								setFilter(filter);
							})}
							style={{ fontSize:'90%', textAlign:'right'}}
						/>
					</Stack>
				</Stack>
				<Stack>
					<Text size={200} style={{color:'gray'}}>..showing {filteredTransactions.length+'/'+allTransactions.length}</Text>
				</Stack>
				<Stack style={{width:'100%'}}>
					<DetailsList
						compact={true}
						items={filteredTransactions}
						columns={columns}
						selectionMode={SelectionMode.none}
						layoutMode={DetailsListLayoutMode.justified}
						ariaLabelForSelectionColumn="Toggle selection"
						ariaLabelForSelectAllCheckbox="Toggle selection for all items"
						checkButtonAriaLabel="select row"
						/>
				</Stack>
			</Stack>) : (
			<Text size={200} style={{color:'gray'}}>loading.. hit 'refresh' if it persists..</Text>
			)
		}
		</Stack>
	</ConnectionsContext.Provider>
	);
};

interface AppProps {}
export default App;
