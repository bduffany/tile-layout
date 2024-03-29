import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './example/App';
import reportWebVitals from './reportWebVitals';
import setFont from './util/setFont';

(window as any).setFont = setFont;

ReactDOM.render(<App />, document.getElementById('root'));

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
