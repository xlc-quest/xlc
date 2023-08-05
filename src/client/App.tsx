import * as React from 'react';
import { useBoolean, useSetInterval } from '@fluentui/react-hooks';

import { useId, Text } from "@fluentui/react-components";
import { Stack, Label, TextField, Alignment, IStackStyles, IStackTokens, IStackItemStyles, StackItem, updateT } from '@fluentui/react';
import { DetailsList, DetailsListLayoutMode, Selection, SelectionMode, IColumn } from '@fluentui/react/lib/DetailsList';
import { MarqueeSelection } from '@fluentui/react/lib/MarqueeSelection';
import { NeutralColors } from '@fluentui/theme';
import { DefaultPalette } from '@fluentui/react/lib/Styling';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';

import axios from 'axios';
import { useState, useEffect } from 'react';
import { SendCalloutBtn } from './SendCalloutBtn';

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

//const TransactionsContext = React.createContext([]);

//const transactions = [];
const App = (props: AppProps) => {
	const [transactions, updateTransactions] = useState<any[]>([]);
	const [amount, setAmount] = useState<number>(0);

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
		.get(`http://localhost:3000/transactions?id=client`)
		.then((res) => {
			if (res.data.length <= 0) return;
			updateTransactions( (prevList) => {
				const updatedTransactions = [...res.data.reverse()];
				setAmount(updatedTransactions.reduce((sum, t) =>  sum += Number(t.amount), 0));
				return updatedTransactions;
			});
		});
	}

	const _onClickRefresh = () => {
		refreshTransactionsAsync();
	}

	useEffect(() => {
		refreshTransactionsAsync();
	}, []);

	// axios
	// .get(`http://localhost:3000/transactions?id=client`)
	// .then((res) => {
	// 	if (res.data.length <= 0) return;
	// 	updateTransactions( (prevList) => [...res.data]);
	// })

	return (
	<div style={{ textAlign: 'end' }}>
		<Stack enableScopedSelectors styles={stackStyles} tokens={verticalGapStackTokens}>
			<h1 style={{ fontSize:'24px', lineHeight:'24px', margin: 0, padding: 0, color: NeutralColors.gray120 }}>..xlc</h1>
			<Stack horizontal horizontalAlign='end'>
				<Text>@xlcdev</Text>
			</Stack>
			<Stack horizontal horizontalAlign='end'>
				<Text size={900}><small>x$</small>{amount.toFixed(2)}</Text>
			</Stack>
			<Stack horizontal horizontalAlign='end'>
				<DefaultButton text="refresh" onClick={_onClickRefresh} />
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
	</div>
	);
};

interface AppProps {}
export default App;
