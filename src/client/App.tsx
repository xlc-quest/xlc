import * as React from 'react';
import { useBoolean, useSetInterval } from '@fluentui/react-hooks';

import { useId, Text } from "@fluentui/react-components";
import { Stack, Label, TextField, Alignment, IStackStyles, IStackTokens, IStackItemStyles, StackItem } from '@fluentui/react';
import { DetailsList, DetailsListLayoutMode, Selection, IColumn } from '@fluentui/react/lib/DetailsList';
import { MarqueeSelection } from '@fluentui/react/lib/MarqueeSelection';
import { NeutralColors } from '@fluentui/theme';
import { DefaultPalette } from '@fluentui/react/lib/Styling';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';

import axios from 'axios';
import { useState, useEffect } from 'react';

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
  
function _onClickSend(): void {
	console.log(`Send button pressed`);
}

const App = (props: AppProps) => {
	const [transactions, updateTransactions] = useState([]);
	//const xDollarLabelId = useId("xDollarLabelId");
	//const amountId = useId("amountId");

	// useEffect(() => {
	// 	axios
	// 	.get(`http://localhost:3000/transactions?id=client`)
	// 	.then((res) => {
	// 		updateTransactions(res.data);
	// 	})
	// 	.catch((e) => {});
	// });
	const {setInterval, clearInterval} = useSetInterval();

	// const transactionsInterval = setInterval(() => {
	// 	axios
	// 	.get(`http://localhost:3000/transactions?id=client`)
	// 	.then((res) => {
	// 		updateTransactions(res.data);
	// 		console.log(transactions);
	// 	})
	// 	.catch((e) => {});
	// }, 3000);

	const columns = [
		{ key: 'id', name: 'transaction#', fieldName: 'id', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'time', name: 'time', fieldName: 'time', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'from', name: 'from', fieldName: 'from', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'to', name: 'to', fieldName: 'to', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'amount', name: 'amount', fieldName: 'amount', minWidth: 100, maxWidth: 200, isResizable: true },
		{ key: 'message', name: 'message', fieldName: 'message', minWidth: 100, maxWidth: 200, isResizable: true },
	];

	useEffect(() => {

	});

	// const columns = [
	// 	{ key: 'column1', name: 'Name', fieldName: 'name', minWidth: 100, maxWidth: 200, isResizable: true },
	// 	{ key: 'column2', name: 'Value', fieldName: 'value', minWidth: 100, maxWidth: 200, isResizable: true },
	// ];

	return (
	<div style={{ textAlign: 'end' }}>
		<Stack enableScopedSelectors styles={stackStyles} tokens={verticalGapStackTokens}>
			<h1 style={{ fontSize:'24px', lineHeight:'24px', margin: 0, padding: 0, color: NeutralColors.gray120 }}>..xlc</h1>
			<Stack horizontalAlign='end'>
				<Text size={900}><small>x$</small>0.1692</Text>
				<PrimaryButton text="Send" onClick={_onClickSend} />
			</Stack>
			<Stack>
				<DetailsList
						items={transactions}
						columns={columns}
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
