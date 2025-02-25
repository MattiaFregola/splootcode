import "./insert_box.css"

import Fuse from "fuse.js"
import { observer } from "mobx-react"
import React from "react"

import { InsertBoxData } from "../../context/insert_box"
import {
  NodeSelection,
  NodeSelectionState,
  SelectionState,
} from "../../context/selection"
import { ParentReference } from "../../language/node"
import {
  getAutocompleteFunctionsForCategory,
  NodeCategory,
  SuggestionGenerator,
} from "../../language/node_category_registry"
import { SuggestedNode } from "../../language/suggested_node"
import { EditorNodeBlock } from "./node_block"
import { RenderedChildSetBlock, stringWidth } from "../../layout/rendered_childset_block"

function filterSuggestions(parentRef: ParentReference, index: number, staticSuggestions: SuggestedNode[], generators: Set<SuggestionGenerator>, userInput: string) : SuggestedNode[] {
  let suggestions = [...staticSuggestions];
  generators.forEach((generator: SuggestionGenerator) => {
    suggestions = suggestions.concat(generator.dynamicSuggestions(parentRef, index, userInput))
  });
  const options: Fuse.FuseOptions<SuggestedNode> = {
    keys: ['key', 'display', 'searchTerms'],
    caseSensitive: false,
  };
  const fuse = new Fuse(suggestions, options)
  const results = fuse.search(userInput) as SuggestedNode[];
  return results;
}

interface InsertBoxState {
  userInput: string;
  autoWidth: number;
  filteredSuggestions: SuggestedNode[];
  staticSuggestions: SuggestedNode[];
  suggestionGenerators: Set<SuggestionGenerator>;
  activeSuggestion: number;
  category: NodeCategory;
  index: number;
  listBlock: RenderedChildSetBlock;
}

interface InsertBoxProps {
  editorX: number;
  editorY: number;
  insertBoxData: InsertBoxData;
  selection: NodeSelection;
}

@observer
export class InsertBox extends React.Component<InsertBoxProps, InsertBoxState> {
  private inputRef: React.RefObject<HTMLInputElement>;

  constructor(props: InsertBoxProps) {
    super(props);
    this.inputRef = React.createRef();
    let { selection } = props;
    let childSetBlock = selection.cursor.listBlock;
    let index = selection.cursor.index;
    let category = childSetBlock.childSet.nodeCategory;
    let parentRef = childSetBlock.childSet.getParentRef();
    let suggestionGeneratorSet = getAutocompleteFunctionsForCategory(category)
    let staticSuggestions = [];
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      staticSuggestions = staticSuggestions.concat(generator.staticSuggestions(parentRef, index))
    })
    const filteredSuggestions = filterSuggestions(parentRef, index, staticSuggestions, suggestionGeneratorSet, '');

    this.state = {
      userInput: '',
      autoWidth: this.getWidth(''),
      filteredSuggestions: filteredSuggestions,
      suggestionGenerators: suggestionGeneratorSet,
      staticSuggestions: staticSuggestions,
      activeSuggestion: 0,
      category: category,
      index: index,
      listBlock: childSetBlock,
    };
  }

  static getDerivedStateFromProps(props: InsertBoxProps, state: InsertBoxState) {
    let { selection } = props;
    let childSetBlock = selection.cursor.listBlock;
    let index = selection.cursor.index;
    let category = childSetBlock.childSet.nodeCategory;
    if (category !== state.category || index !== state.index || childSetBlock !== state.listBlock) {
      let parentRef = childSetBlock.childSet.getParentRef();
      let suggestionGeneratorSet = getAutocompleteFunctionsForCategory(category)
      let staticSuggestions = [];
      suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
        staticSuggestions = staticSuggestions.concat(generator.staticSuggestions(parentRef, index))
      })
      const filteredSuggestions = filterSuggestions(parentRef, index, staticSuggestions, suggestionGeneratorSet, state.userInput);
      return {
        filteredSuggestions: filteredSuggestions,
        suggestionGenerators: suggestionGeneratorSet,
        staticSuggestions: staticSuggestions,
        category: category,
        index: index,
        listBlock: childSetBlock,
      }
    }
    return null;
  }

  render() {
    let { userInput, autoWidth, filteredSuggestions, activeSuggestion } = this.state;
    let { selection, insertBoxData } = this.props;
    const isInserting = selection.state === SelectionState.Inserting;

    let suggestionsListComponent: JSX.Element;
    if (selection.state === SelectionState.Inserting) {
      if (filteredSuggestions.length) {
        suggestionsListComponent = (
          <ul className="autocomplete-suggestions">
            {filteredSuggestions.map((suggestion, index) => {
              let className: string = '';

              // Flag the active suggestion with a class
              if (index === activeSuggestion) {
                className = "autocomplete-suggestion-active";
              }

              if (!suggestion.valid) {
                className += " invalid"
              }

              return (
                <li
                  className={className}
                  key={suggestion.key}
                  onClick={this.onClickSuggestion(suggestion)}
                >
                  <svg
                      className="autocomplete-inline-svg"
                      height={suggestion.nodeBlock.rowHeight}
                      width={suggestion.nodeBlock.rowWidth + 2}
                  ><EditorNodeBlock
                      block={suggestion.nodeBlock}
                      selection={null}
                      selectionState={NodeSelectionState.UNSELECTED}
                    /></svg>
                  <span className="autocomplete-description">{ suggestion.description}</span>
                </li>
              );
            })}
          </ul>
        );
      } else {
        suggestionsListComponent = (
          null
        );
      }
    }

    let {editorX, editorY} = this.props;
    let {x, y} = insertBoxData;
    let positionStyles : React.CSSProperties;
    if (isInserting) {
      positionStyles = {
        position: 'absolute',
        left: (x + editorX) + 'px',
        top: (y + editorY + 1) + 'px',
      }
    } else {
      positionStyles = {
        position: 'absolute',
        left: (x + editorX - 2) + 'px',
        top: (y + editorY + 1) + 'px',
      }
    }

    return (
      <div style={positionStyles}>
        <div className={isInserting ? "input-box" : "hidden-input-box"}>
          <input
              autoFocus
              type="text"
              id="insertbox"
              ref={this.inputRef}
              defaultValue={userInput}
              onChange={this.onChange}
              onClick={this.onClick}
              onKeyDown={this.onKeyDown}
              onKeyPress={this.onKeyPress}
              onBlur={this.onBlur}
              style={{"width": autoWidth}}
              />
        </div>
        { suggestionsListComponent }
      </div>
    );
  }

  onKeyPress = (e : React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      return false;
    }
  }

  isOpenString = () => {
    const inp = this.state.userInput;
    if (inp.startsWith('\'') || inp.startsWith('"')) {
      return inp[0] !== inp[inp.length - 1];
    }
    return false;
  }

  onKeyDown = (e : React.KeyboardEvent<HTMLInputElement>) => {
    let { selection } = this.props;

    if (selection.state === SelectionState.Cursor) {
      if (e.key === 'Enter') {
        selection.insertNewline()
      }
      return;
    }

    const { activeSuggestion, filteredSuggestions, userInput } = this.state;

    // Enter key when inserting
    if (e.key === 'Enter' && userInput === '') {
      selection.unindentCursor();
      return;
    }

    // Escape
    if (e.key === 'Escape') {
      this.inputRef.current.value = '';
      selection.exitEdit();
      e.stopPropagation();
    }

    // Enter or space key
    if (e.key === 'Enter' || (e.key === ' ' && !this.isOpenString())) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation()
      let selectedNode = filteredSuggestions[activeSuggestion];
      if (selectedNode !== undefined) {
        this.setState({
          activeSuggestion: 0,
        });
        this.onSelected(selectedNode);
      }
    }
    // User pressed the up arrow, decrement the index
    else if (e.key === 'ArrowUp' && filteredSuggestions.length > 0) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      if (activeSuggestion === 0) {
        return;
      }

      this.setState({ activeSuggestion: activeSuggestion - 1 });
    }
    // User pressed the down arrow, increment the index
    else if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      if (activeSuggestion === filteredSuggestions.length - 1) {
        return;
      }

      this.setState({ activeSuggestion: activeSuggestion + 1 });
    }

    // Don't move the node cursor, just let the text box do its thing for left/right arrows.
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation();
    }
  }

  onBlur = (e : React.FocusEvent<HTMLInputElement>) => {
    let selection = this.props.selection;
    if (selection.state === SelectionState.Cursor) {
      selection.clearSelection();
    }
  }

  getWidth = (input: string) => {
    return stringWidth(input) + 6;
  }

  onClick = (e : React.MouseEvent<HTMLInputElement>) => {
    // e.stopPropagation();
  }

  onChange = (e : React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget.value === ' ') {
      e.currentTarget.value = '';
    }
    const userInput = e.currentTarget.value;
    if (userInput !== '') {
      const { staticSuggestions, suggestionGenerators } = this.state;
      let childSetBlock = this.props.selection.cursor.listBlock;
      let index = this.props.selection.cursor.index;

      let parentRef = childSetBlock.childSet.getParentRef();
      const filteredSuggestions = filterSuggestions(parentRef, index, staticSuggestions, suggestionGenerators, userInput);
      this.props.selection.startInsertAtCurrentCursor();
      this.setState({
          userInput: e.currentTarget.value,
          autoWidth: this.getWidth(e.currentTarget.value),
          filteredSuggestions: filteredSuggestions,
      });
    } else {
      this.setState({
        userInput: '',
        autoWidth: this.getWidth(e.currentTarget.value),
        filteredSuggestions: [],
      });
    }
  }

  onSelected(suggestion: SuggestedNode) {
    const {selection} = this.props;
    let childSetBlock = selection.cursor.listBlock;
    let index = selection.cursor.index;
    if (suggestion.wrapChildSetId) {
      selection.wrapNode(childSetBlock, index - 1, suggestion.node, suggestion.wrapChildSetId);
    } else {
      selection.insertNode(childSetBlock, index, suggestion.node);
    }
    this.inputRef.current.value = '';
  }

  // Event fired when the user clicks on a suggestion
  onClickSuggestion = (suggestion: SuggestedNode) => {
    return (e : React.MouseEvent<HTMLLIElement>) => {
      // Update the user input and reset the rest of the state
      this.setState({
        activeSuggestion: 0,
        filteredSuggestions: [],
      });
      this.onSelected(suggestion);
    };
  };
}