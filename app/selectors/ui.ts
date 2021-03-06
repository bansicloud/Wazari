import {
  createSelectorCreator,
  defaultMemoize,
  createSelector
} from "reselect";
import { isEqual } from "lodash";

const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual);

const sitesSelector = (state, paneId: string) => {
  const sites = state.ui.getIn(["panes", paneId, "sites"]);
  return sites ? sites.toJS() : [];
};

export const selectSites = createDeepEqualSelector([sitesSelector], sites => {
  return sites;
});

const activeTabIndexSelector = (state, paneId: string) => {
  return state.ui.getIn(["panes", paneId, "activeTabIndex"]);
};

export const selectActiveUrl = createSelector(
  [sitesSelector, activeTabIndexSelector],
  (sites, activeTabIndex) => {
    return sites[activeTabIndex] ? sites[activeTabIndex].url : null;
  }
);

export const selectActiveSite = createSelector(
  [sitesSelector, activeTabIndexSelector],
  (sites, activeTabIndex) => {
    return sites[activeTabIndex] ? sites[activeTabIndex] : null;
  }
);
