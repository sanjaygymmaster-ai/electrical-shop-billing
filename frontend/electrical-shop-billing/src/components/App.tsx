import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Login from './Login';
import Home from '../pages/Home';

const App: React.FC = () => {
    return (
        <Router>
            <Switch>
                <Route path="/" exact component={Login} />
                <Route path="/home" component={Home} />
            </Switch>
        </Router>
    );
};

export default App;