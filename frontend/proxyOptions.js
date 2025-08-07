// Proxy configuration to route API requests to Frappe backend
export default {
	'^/(app|api|assets|files|private)': {
		target: 'https://crew.tierneymorris.com.au',
		changeOrigin: true,
		secure: true,
		ws: true,
	}
};
