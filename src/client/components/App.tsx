import * as React from 'react';
import { useBoolean, useSetInterval } from '@fluentui/react-hooks';

import { useId, Text, Link } from "@fluentui/react-components";
import { Stack, Label, TextField, Alignment, IStackStyles, IStackTokens, IStackItemStyles, StackItem, updateT, Icon } from '@fluentui/react';
import { DetailsList, DetailsListLayoutMode, Selection, SelectionMode, IColumn } from '@fluentui/react/lib/DetailsList';
import { MarqueeSelection } from '@fluentui/react/lib/MarqueeSelection';
import { NeutralColors } from '@fluentui/theme';
import { DefaultPalette } from '@fluentui/react/lib/Styling';
import { ActionButton, DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';

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

// const setClientFunc: Function = () => {};
// export const ConnectionsContext = createContext({
//     client: connections.client,
//     setClient: setClientFunc
// });

interface Transaction {
	id?: string,
	time?: string,
	from?: string,
	to?: string,
	amount?: string,
	message?: string,
	contracts?: any[]
}

//const transactions = [];
const App = (props: AppProps) => {
	const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
	const [filter, setFilter] = useState('');
	const [filteredTransactions, setFilteredTransactions] = useState<any[]>(allTransactions);
	const [client, setClient] = useState(connections.client);
	const [summary, setSummary] = useState(connections.summary);

	const columns = [
		{ key: 'id', name: 'transaction#', fieldName: 'id', 		minWidth: 50, maxWidth: 250, isResizable: true },
		{ key: 'time', name: 'time', fieldName: 'time', 			minWidth: 50, maxWidth: 150, isResizable: true },
		{ key: 'from', name: 'from', fieldName: 'from', 			minWidth: 50, maxWidth: 100, isResizable: true },
		{ key: 'to', name: 'to', fieldName: 'to', 					minWidth: 50, maxWidth: 100, isResizable: true },
		{ key: 'amount', name: 'amount', fieldName: 'amount', 		minWidth: 50, maxWidth: 80, isResizable: true },
		{ key: 'message', name: 'message', fieldName: 'message', 	minWidth: 200, maxWidth: 500, isResizable: true },
		{ key: 'actions', name: 'actions', fieldName: 'actions', 	minWidth: 200, maxWidth: 200, isResizable: true },
	];

	const onRefreshAsync = () => {
		const getTxsUrl = client.id.toLowerCase() == '@root' ?
			`${configs.serverUrl}/transactions?id=${client.id}&all=true` :
			`${configs.serverUrl}/transactions?id=${client.id}&contracts=true`;
		return axios
		.get(getTxsUrl)
		.then((txRes) => {
			if (!txRes.data) return;
			const transactions: Transaction[] = [];
			txRes.data.forEach((t: any) => {
				transactions.push({
					id: t.id,
					from: t.from,
					to: t.to,
					time: new Date(t.time).toLocaleString(),
					message: t.message,
					amount: 'x$'+Number(t.amount).toFixed(4),
					contracts: t.contracts
				})
			});

			axios.get(`${configs.serverUrl}/transactions?summary=true&id=${client.id}`).then((summaryRes) => {
				if (!summaryRes.data) return;

				connections.summary.balance = summaryRes.data.balance.total;
				connections.summary.fromAmount = summaryRes.data.balance.fromAmount;
				connections.summary.toAmount = summaryRes.data.balance.toAmount;
				connections.summary.transactionsFrom = summaryRes.data.transactions.from;
				connections.summary.transactionsTo = summaryRes.data.transactions.to;
				connections.summary.myTransactions = summaryRes.data.transactions.mine;
				connections.summary.allTransactions = summaryRes.data.transactions.all;

				setSummary({...connections.summary});
			});

			setAllTransactions(transactions.reverse());
			setFilteredTransactions(transactions);
		});
	}

	const onUpdateSettings = (settings: { username: string }) => {
		connections.stop();

		client.id = settings.username;
		connections.client.id = client.id;
		setClient({...client });
		onRefreshAsync().then(() => {
			connections.start();
		});
	}

	const _onClickRefresh = () => {
		setFilter('');
		onRefreshAsync();
	};

	const _onClickLike = (txId?: string) => {
		const tx = filteredTransactions.find(t => t.id == txId);
		if (!tx) {
			alert(`can't be!`);
		}

		let promise: Promise<void>;
		const responseContract = tx.contracts ? tx.contracts.find((c: any) => c.type == 'responses') : undefined;
		if (responseContract) {
			promise = axios
			.patch(`${configs.serverUrl}/contracts?id=${responseContract.id}`, {
				args: ['like'],
				contractor: client.id
			});
		} else {
			promise = axios
			.post(`${configs.serverUrl}/contracts`, {
				txId: txId,
				type: 'responses',
				args: ['like'],
				contractor: client.id
			});
		}

		promise.then((res) => {
			_onClickRefresh();
		});
	};

	const _onClickDislike = (txId?: string) => {
		const tx = filteredTransactions.find(t => t.id == txId);
		if (!tx) {
			alert(`can't be!`);
		}

		let promise: Promise<void>;
		const responseContract = tx.contracts ? tx.contracts.find((c: any) => c.type == 'responses') : undefined;
		if (responseContract) {
			promise = axios
			.patch(`${configs.serverUrl}/contracts?id=${responseContract.id}`, {
				args: ['dislike'],
				contractor: client.id
			});
		} else {
			promise = axios
			.post(`${configs.serverUrl}/contracts`, {
				txId: txId,
				type: 'responses',
				args: ['dislike'],
				contractor: client.id
			});
		}

		promise.then((res) => {
			_onClickRefresh();
		});
	};

	const _renderItemColumn = (item: any, index: any, column: any) => {
		const fieldContent = item[column.fieldName];
		const tx = item as Transaction;

		let likes = 0;
		let liked = false;
		let dislikes = 0;
		let disliked = false;
		let comments = 0;
		if (tx.contracts && tx.contracts.length > 0) {
			const responseContract = tx.contracts.find(c => c.type == 'responses');
			const commentsContract = tx.contracts.find(c => c.type == 'comments');

			if (responseContract) {
				likes = responseContract.args.reduce((sum: number, v: string) => {
					return sum += (v.toLowerCase() == 'like') ? 1: 0;
				}, 0);

				dislikes = responseContract.args.reduce((sum: number, v: string) => {
					return sum += (v.toLowerCase() == 'dislike') ? 1: 0;
				}, 0);
				
				const idx = responseContract.contractors.findIndex((c: string) => c == client.id);
				if (idx >= 0) {
					liked = responseContract.args[idx] == 'like';
					disliked = responseContract.args[idx] == 'dislike';
				}
			}
		}

		switch (column.key) {
			case 'actions':
				return <Stack horizontal horizontalAlign='end'>
					<ActionButton disabled={tx.from?.startsWith('@server') || tx.from?.startsWith('@connections')}
						iconProps={{iconName: liked ? 'LikeSolid' : 'Like'}} text={likes.toLocaleString()} onClick={() => {_onClickLike(tx.id)}} />
					<ActionButton disabled={tx.from?.startsWith('@server') || tx.from?.startsWith('@connections')}
						iconProps={{iconName: disliked ? 'DislikeSolid' : 'Dislike'}} text={dislikes.toLocaleString()} onClick={() => {_onClickDislike(tx.id)}} />
					<ActionButton disabled={tx.from?.startsWith('@server') || tx.from?.startsWith('@connections')}
						iconProps={{iconName: 'Comment'}} text={comments.toString()} onClick={_onClickRefresh} />
					<ActionButton disabled={tx.from?.startsWith('@server') || tx.from?.startsWith('@connections')}
						iconProps={{iconName: 'Reply'}} onClick={_onClickRefresh} />
				</Stack>
			default:
				return <span>{fieldContent}</span>;
		}
	};

	// const _renderItemColumn = (item: Transaction, index: number, column: IColumn) => {
	// 	const fieldContent = item[column.fieldName as keyof Transaction] as string;
	
	// 	switch (column.key) {
	// 	//   case 'thumbnail':
	// 	// 	return <Image src={fieldContent} width={50} height={50} imageFit={ImageFit.cover} />;
	  
	// 	//   case 'name':
	// 	// 	return <Link href="#">{fieldContent}</Link>;
	  
	// 	//   case 'color':
	// 	// 	return (
	// 	// 	  <span
	// 	// 		data-selection-disabled={true}
	// 	// 		className={mergeStyles({ color: fieldContent, height: '100%', display: 'block' })}
	// 	// 	  >
	// 	// 		{fieldContent}
	// 	// 	  </span>
	// 	// 	);
	// 	  	default:
	// 			return <span>{fieldContent}</span>;
	// 	}
	//   }

	useEffect(() => {
		connections.start(setClient);
		onRefreshAsync();
	}, []);

	return (
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
			<Text size={900}><small>x$</small>{summary.balance.toFixed(4)}</Text>
		</Stack>
		<Stack horizontal horizontalAlign='end'>
			
		</Stack>
		<Stack horizontal horizontalAlign='end'>
			<IconButton iconProps={{iconName: 'Refresh'}} text="refresh" onClick={_onClickRefresh} />
			<SettingsDlgBtn onUpdateSettings={onUpdateSettings}></SettingsDlgBtn>
			<SendCalloutBtn refreshTransactionsAsync={onRefreshAsync} />
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
				<Text size={200} style={{color:'gray'}}>..in x${summary.toAmount.toFixed(4)} out x${summary.fromAmount.toFixed(4)}.. showing {`${filteredTransactions.length}/${allTransactions.length}..${summary.myTransactions > 1000 ? summary.myTransactions + 'txs' : ''} of ${summary.allTransactions} total..`}</Text>
			</Stack>
			<Stack style={{width:'100%'}}>
				<DetailsList
					compact={true}
					items={filteredTransactions}
					columns={columns}
					selectionMode={SelectionMode.none}
					onRenderItemColumn={_renderItemColumn}
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
	);
};

interface AppProps {}
export default App;
