import React from 'react';
import { Router, Route, useRouterHistory } from 'react-router';
import { createHashHistory } from 'history';
import ReactGA from 'react-ga';

import config from 'config';

import { List, Redirect, Message } from '.';

export default class App extends React.Component {

  constructor(props) {
    super(props);
    ReactGA.initialize(config.trackingID);
  }

  logPageView() {
    const pageLink = window.location.pathname + (window.location.hash == '#/' ? '' : window.location.hash);
    ReactGA.set({
      page: pageLink
    });
    ReactGA.pageview(pageLink);
  }

  routes = <Route>
             <Route
               path="/"
               component={ List } />
             <Route
               path="/:illustId"
               component={ Redirect } />
             <Route
               path="*"
               component={ Message } />
           </Route>;

  appHistory = useRouterHistory(createHashHistory)({
    queryKey: false
  });


  render() {
    return (
      <Router
        history={ this.appHistory }
        onUpdate={ this.logPageView }>
        { this.routes }
      </Router>
      );
  }

}
