import React, { Component } from "react";
import {
  View,
  NativeModules,
  NativeEventEmitter,
  TextInput
} from "react-native";
import { connect } from "react-redux";
import DeviceInfo from "react-native-device-info";
import {
  Button,
  Icon,
  Header,
  Item,
  Input,
  Left,
  Text,
  List,
  ListItem,
  Content
} from "native-base";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Favicon from "../components/Favicon";
import WVInput from "../components/WVInput";
import { selectBrowserKeymap, selectModifiers } from "../selectors/keymap";
import {
  selectActiveUrl,
  selectActiveSite,
  selectSites
} from "../selectors/ui";
import {
  updateFocusedPane,
  updateWordsForPageFind,
  toggleSoftCapslock
} from "../actions/ui";
import { SearchEngine } from "../components/SearchEnginePicker";
import Modal from "react-native-modal";
import { addNewTab, selectTab, toggleBack, toggleForward } from "../actions/ui";
import Fuse from "fuse.js";

const { DAVKeyManager } = NativeModules;
const DAVKeyManagerEmitter = new NativeEventEmitter(DAVKeyManager);

interface IState {
  text: string;
  urlText: string;
  selectionStart: number;
  selectionEnd: number;
  selectedItemIndex: number | null;
  result: Array<any>;
  selectMode: boolean;
  capsLockOn: boolean;
}

interface Props {
  searchIsFocused: boolean;
  dispatch: (any) => void;
  searchEngine: SearchEngine;
  homeUrl: string;
  orientation: string;
  activeUrl: string | null;
  activeSite: any | null;
  focusedPane: string;
  sites: any;
  history: Array<any>;
  closeSearch: () => void;
  activeTabIndex: number | null;
}

class Search extends Component<Props, IState, any> {
  private searchRef: TextInput | null = null;
  private subscriptions: Array<any> = [];
  private fuse: any;

  // For sort with usage on search. The element is original index. the Index is sorted one.
  private currentTabIndice: Array<number> = [];

  constructor(props) {
    super(props);
    const site = props.activeSite;
    this.state = {
      text: "",
      selectionStart: 0,
      selectionEnd: 0,
      selectedItemIndex: null,
      result: [],
      selectMode: false,
      capsLockOn: false,
      urlText: "",
      action: "",
      debug: ""
    };
  }

  componentDidMount() {
    const { activeSite, activeUrl, history } = this.props;
    this.subscriptions.push;
    this.props.searchIsFocused === true &&
      this.searchRef &&
      this.searchRef._root.focus();

    this.fuse = new Fuse(history, {
      shouldSort: true,
      includeMatches: true,
      threshold: 0.2,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 2,
      keys: ["url", "title"]
    });
  }

  componentWillUnmount() {
    this.subscriptions.forEach(subscription => {
      subscription.remove();
    });
  }

  componentDidUpdate(prevProp, prevState) {
    const {
      dispatch,
      orientation,
      activeUrl,
      activeSite,
      focusedPane,
      searchIsFocused,
      history,
      sites
    } = this.props;
    const { text, selectMode, selectedItemIndex, result } = this.state;

    if (searchIsFocused !== prevProp.searchIsFocused) {
      if (searchIsFocused === true) {
        this.searchRef && this.searchRef._root.focus();
      } else {
        this.searchRef && this.searchRef._root.blur();
      }
    }

    if (prevState.text !== text) {
      if (text.length === 0) {
        this.setState({
          result: [],
          selectMode: false,
          selectedItemIndex: null
        });
      } else {
        if (!selectMode) {
          // only updates when it's not select mode
          const result = this.fuse.search(text);
          this.setState({ result: result });
        }
      }
    }

    if (
      selectMode === true &&
      prevState.selectedItemIndex !== selectedItemIndex
    ) {
      if (text.length === 0) {
      } else {
        let nextText = history[selectedItemIndex].url;
        if (result.length !== 0) {
          nextText = result[selectedItemIndex].item.url;
        }
        this.setState({ urlText: nextText, text: nextText });
      }
    }
  }

  onEndEditing(words) {
    const { dispatch, searchEngine, sites } = this.props;
    let text = words || this.state.text;
    if (text === "") {
      if (this.state.selectMode) {
        setTimeout(() => {
          dispatch(
            selectTab(this.currentTabIndice[this.state.selectedItemIndex])
          );
        }, 500);
      }
    } else {
      const trimmedText = text.replace(/^\s+|\s+$/g, "");
      if (trimmedText === "") {
        this.searchRef && this.searchRef._root.blur();
        return;
      } else if (/^http/.test(text)) {
        dispatch(addNewTab(text));
      } else {
        if (searchEngine === SearchEngine.Google) {
          dispatch(addNewTab(`https://www.google.com/search?q=${text}`));
        } else if (searchEngine === SearchEngine.DuckDuckGo) {
          dispatch(addNewTab(`https://duckduckgo.com/?q=${text}`));
        }
      }
      setTimeout(() => {
        dispatch(selectTab(sites.length));
      }, 50);
    }
    this.setState({ text: "", selectMode: false });
    this.props.closeSearch();
  }

  urlToPattern(url) {
    /^(.*:)\/\/([A-Za-z0-9\-\.]+)(:[0-9]+)?(.*)$/.test(url);
    const host = RegExp.$2;
    const port = RegExp.$3;
    const pattern = port ? `https?://${host}${port}/*` : `https?://${host}/*`;
    return pattern;
  }

  nextHistoryItem() {
    const { history, sites } = this.props;
    const { result, selectedItemIndex, selectMode, text } = this.state;
    const maxItemCount: number =
      text.length === 0
        ? sites.length - 1
        : result.length === 0
        ? history.length
        : result.length;

    if (!selectMode) {
      this.setState({ selectMode: true });
    }

    let nextIndex: number = 0;
    if (selectedItemIndex !== null) {
      if (selectedItemIndex + 1 < maxItemCount) {
        nextIndex = selectedItemIndex + 1;
      } else {
        nextIndex = 0;
      }
    }

    this.setState({
      selectedItemIndex: nextIndex
    });
  }

  previousHistoryItem() {
    const { history, sites } = this.props;
    const { result, selectedItemIndex, selectMode, text } = this.state;
    const maxItemCount: number =
      text.length === 0
        ? sites.length - 1
        : result.length === 0
        ? history.length
        : result.length;

    if (!selectMode) {
      this.setState({ selectMode: true });
    }

    let index: number = maxItemCount - 1;
    if (selectedItemIndex !== null) {
      if (this.state.selectedItemIndex > 0) {
        index = this.state.selectedItemIndex - 1;
      }
    }

    this.setState({
      selectedItemIndex: index
    });
  }

  onPressHistoryItem(url: string) {
    this.setState({ text: url });
    this.props.closeSearch();
  }

  onPressTab(index: number) {
    const { dispatch } = this.props;
    setTimeout(() => {
      dispatch(selectTab(index));
    }, 500);
    this.props.closeSearch();
  }

  renderCurrentTabs() {
    const { sites, activeTabIndex } = this.props;
    this.currentTabIndice = [];
    return sites
      .map((item, i) => {
        item.idx = i; // keep original index to use the below map()
        return item;
      })
      .filter((item, i) => activeTabIndex !== i)
      .sort((a, b) => {
        if (!a.updatedAt || !b.updatedAt) {
          return 0;
        } else if (a.updatedAt > b.updatedAt) {
          return -1;
        } else {
          return 1;
        }
      })
      .map((item, i) => {
        this.currentTabIndice[i] = item.idx;
        let isSelected = i === this.state.selectedItemIndex;
        return (
          <ListItem
            key={`current-tabs-${i}`}
            style={{
              marginLeft: 0,
              borderLeftWidth: isSelected ? 5 : 0,
              borderLeftColor: "#30d158",
              backgroundColor: isSelected ? "#eee" : "transparent"
            }}
            onPress={() => this.onPressTab(item.idx)}
          >
            <View style={{ marginLeft: 10 }}>
              <Favicon url={item.url} />
            </View>
            <Text
              style={{
                fontSize: 12,
                paddingLeft: 5
              }}
            >
              {item.url} - {item.title}
            </Text>
          </ListItem>
        );
      });
  }

  renderCandidates() {
    const { history } = this.props;
    if (this.state.text.length === 0) {
      return this.renderCurrentTabs();
    } else {
      return this.state.result.map((h, i) => {
        let isSelected = i === this.state.selectedItemIndex;
        return (
          <ListItem
            key={`history-result-${i}`}
            style={{
              marginLeft: 0,
              borderLeftWidth: isSelected ? 5 : 0,
              borderLeftColor: "#30d158",
              backgroundColor: isSelected ? "#eee" : "transparent"
            }}
            onPress={() => this.onPressHistoryItem(h.item.url)}
          >
            <View style={{ marginLeft: 10 }}>
              <Favicon domain={"www.wazaterm.com"} />
            </View>
            {this.renderMatchedText(h)}
          </ListItem>
        );
      });
    }
  }

  renderMatchedText(h) {
    let urlView: Array<any> = [];
    let titleView: Array<any> = [];
    for (let m of h.matches) {
      let s = 0;
      let v: Array<any> = [];
      for (let index of m.indices) {
        v.push(
          <Text key={`${m.value}-start-${index[0]}`} style={{ fontSize: 12 }}>
            {m.value.slice(s, index[0])}
          </Text>
        );
        v.push(
          <Text
            key={`${m.value}-target-${index[0]}-${index[1]}`}
            style={{ fontWeight: "bold", color: "#007aff", fontSize: 12 }}
          >
            {m.value.slice(index[0], index[1] + 1)}
          </Text>
        );
        s = index[1] + 1;
      }
      v.push(
        <Text key={`${m.value}-end`} style={{ fontSize: 12 }}>
          {m.value.slice(s, m.value.length)}
        </Text>
      );
      if (m.key === "url") {
        urlView = v;
      } else if (m.key === "title") {
        titleView = v;
      }
    }

    if (urlView.length === 0) {
      urlView.push(
        <Text key={`text-url-${h.item.url}`} style={{ fontSize: 12 }}>
          {h.item.url}
        </Text>
      );
    }
    if (titleView.length === 0) {
      titleView.push(
        <Text key={`text-title-${h.item.title}`} style={{ fontSize: 12 }}>
          {h.item.title}
        </Text>
      );
    }

    return (
      <View
        key={`view-${h.item.url}`}
        style={{
          flex: 1,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          paddingLeft: 10
        }}
      >
        {titleView}
        <Text> - </Text>
        {urlView}
      </View>
    );
  }

  closingSearch() {
    this.setState({ text: "", selectedItemIndex: this.props.activeTabIndex });
    this.props.closeSearch();
  }

  performAction(name) {
    console.log(name);
  }

  updateWords(words) {
    console.log(words);
    if (words.length === 0) {
      this.setState({ text: "", selectMode: false });
    } else {
      this.setState({ text: words });
    }
  }

  toggleSoftCapslock() {
    const { dispatch } = this.props;
    console.log("toggleSoftCapslock in search");
    dispatch(toggleSoftCapslock());
  }

  render() {
    const { searchEngine, orientation, browserKeymap, modifiers } = this.props;
    if (
      orientation === "LANDSCAPE" &&
      DeviceInfo.getDeviceType() === "Handset"
    ) {
      return null;
    }
    return (
      <Content
        style={{
          backgroundColor: "white"
        }}
      >
        <Item>
          <Icon name="ios-search" style={{ paddingLeft: 10 }} />
          <WVInput
            keyup={v => this.setState({ text: v })}
            updateCapsLockState={s => this.setState({ capsLockOn: s })}
            modifiers={modifiers}
            browserKeymap={browserKeymap}
            performAction={this.performAction.bind(this)}
            nextHistoryItem={this.nextHistoryItem.bind(this)}
            previousHistoryItem={this.previousHistoryItem.bind(this)}
            onEndEditing={this.onEndEditing.bind(this)}
            updateWords={this.updateWords.bind(this)}
            text={this.state.urlText}
            toggleSoftCapslock={this.toggleSoftCapslock.bind(this)}
            {...this.props}
          />

          <Button
            dark
            transparent
            onPress={() => this.closingSearch()}
            style={{ margin: 10 }}
          >
            <Text
              style={{
                paddingRight: 0,
                paddingLeft: 10,
                fontSize: 12,
                color: "#999"
              }}
            >
              ESC
            </Text>
            <Icon name="ios-close" style={{ paddingLeft: 0, fontSize: 30 }} />
          </Button>
        </Item>
        <List>{this.renderCandidates()}</List>
      </Content>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const history = state.user.get("history").toJS();
  const activePaneId = state.ui.get("activePaneId");
  const isSoftCapslockOn = state.ui.get("isSoftCapslockOn");
  const sites = selectSites(state, activePaneId);
  const activeTabIndex = state.ui.getIn([
    "panes",
    activePaneId,
    "activeTabIndex"
  ]);
  const modifiers = selectModifiers(state);
  const browserKeymap = selectBrowserKeymap(state);

  return {
    history,
    sites,
    activeTabIndex,
    modifiers,
    browserKeymap,
    isSoftCapslockOn
  };
}

export default connect(mapStateToProps)(Search);
