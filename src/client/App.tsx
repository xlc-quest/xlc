import * as React from 'react';
import { useState, useEffect } from 'react';

/* HOOK REACT EXAMPLE */
const App = (props: AppProps) => {
	//const [greeting, setGreeting] = useState<string>('');
	const [showTransfer, setShowTransfer] = useState<boolean>(false);

	useEffect(() => {
		// async function getGreeting() {
		// 	try {
		// 		const res = await fetch('/api/hello');
		// 		const greeting = await res.json();
		// 		setGreeting(greeting);
		// 	} catch (error) {
		// 		console.log(error);
		// 	}
		// }
		// getGreeting();
	}, []);

	return (
		<div>
			<h1>..xlc</h1>
		</div>
	);
};

interface AppProps {}
export default App;
