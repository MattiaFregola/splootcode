import * as recast from "recast";

import { TypeRegistration, LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode } from '../type_registry';
import { SplootNode, ParentReference } from '../node';
import { registerNodeCateogry, NodeCategory, SuggestionGenerator } from '../node_category_registry';
import { SuggestedNode } from '../suggested_node';
import { HighlightColorCategory } from '../../layout/colors';
import { SplootExpression, SPLOOT_EXPRESSION } from "./js/expression";
import { JavaScriptSplootNode } from "../javascript_node";
import { StringLiteralKind } from "ast-types/gen/kinds";
import { PythonExpression, PYTHON_EXPRESSION } from "./python/python_expression";

export const STRING_LITERAL = 'STRING_LITERAL';
export const NUMERIC_LITERAL = 'NUMERIC_LITERAL';
export const NULL_LITERAL = 'NULL_LITERAL';

class StringGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    let emptyString = new StringLiteral(null, '');
    let suggestedNode = new SuggestedNode(emptyString, 'empty string', 'string text empty', true, 'empty string');
    return [suggestedNode];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    if (textInput.startsWith('\'') || textInput.startsWith('"')) {
      let value = textInput.slice(1);
      if (value.length !== 0 && value[value.length - 1] === textInput[0]) {
        value = value.slice(0, value.length - 1);
      }
      const customString = new StringLiteral(null, value);
      const suggestedNode = new SuggestedNode(customString, `string ${value}`, value, true, 'string');
      return [suggestedNode];
    }
    return [];
  }
}

export class StringLiteral extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, value: string) {
    super(parentReference, STRING_LITERAL);
    this.properties = {value: value};
  }

  getValue() {
    return this.properties.value;
  }

  getEditableProperty() {
    return 'value';
  }

  generateJsAst() : StringLiteralKind {
    return recast.types.builders.stringLiteral(this.getValue());
  }

  static deserializer(serializedNode: SerializedNode) : StringLiteral {
    return new StringLiteral(null, serializedNode.properties.value)
  }

  static register() {
    let stringLiteral = new TypeRegistration();
    stringLiteral.typeName = STRING_LITERAL;
    stringLiteral.deserializer = StringLiteral.deserializer;
    stringLiteral.properties = ['value'];
    stringLiteral.layout = new NodeLayout(HighlightColorCategory.LITERAL_STRING, [
      new LayoutComponent(LayoutComponentType.STRING_LITERAL, 'value'),
    ]);
    stringLiteral.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
    stringLiteral.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      let exp = new PythonExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
    registerType(stringLiteral);
    registerNodeCateogry(STRING_LITERAL, NodeCategory.ExpressionToken, new StringGenerator());
    registerNodeCateogry(STRING_LITERAL, NodeCategory.PythonExpressionToken, new StringGenerator());
    registerNodeCateogry(STRING_LITERAL, NodeCategory.DomNode, new StringGenerator());
    registerNodeCateogry(STRING_LITERAL, NodeCategory.HtmlAttributeValue, new StringGenerator());
    registerNodeCateogry(STRING_LITERAL, NodeCategory.ModuleSource, new StringGenerator());
    registerNodeCateogry(STRING_LITERAL, NodeCategory.StyleSheetPropertyValue, new StringGenerator());
  }
}

class NumberGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let val = parseStringToNum(textInput);
    if (!isNaN(val)) {
      let num = new NumericLiteral(null, val);
      let suggestedNode = new SuggestedNode(num, `number ${val}`, '', true, 'number');
      return [suggestedNode];
    }
    return [];
  }
}

function parseStringToNum(textValue: string | number) : number {
  if (typeof textValue === 'string') {
    let val = parseInt(textValue);
    if (textValue.includes('.')) {
      val = parseFloat(textValue)
    }
    return val;
  }
  return textValue;
}

export class NumericLiteral extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, value: number) {
    super(parentReference, NUMERIC_LITERAL);
    this.properties = {value: value};
  }

  getValue() {
    return this.getProperty('value');
  }

  generateJsAst() {
    return recast.types.builders.numericLiteral(this.getValue());
  }

  getEditableProperty() : string {
    return 'value';
  }

  setPropertyFromString(name: string, value: string) {
    this.setProperty(name, parseStringToNum(value));
  }

  static deserializer(serializedNode: SerializedNode) : NumericLiteral {
    return new NumericLiteral(null, parseStringToNum(serializedNode.properties.value))
  }

  static register() {
    let numericLiteral = new TypeRegistration();
    numericLiteral.typeName = NUMERIC_LITERAL;
    numericLiteral.deserializer = NumericLiteral.deserializer;
    numericLiteral.properties = ['value'];
    numericLiteral.layout = new NodeLayout(HighlightColorCategory.LITERAL_NUMBER, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'value'),
    ]);
    numericLiteral.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
    numericLiteral.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      let exp = new PythonExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
    registerType(numericLiteral);
    registerNodeCateogry(NUMERIC_LITERAL, NodeCategory.ExpressionToken, new NumberGenerator());
    registerNodeCateogry(NUMERIC_LITERAL, NodeCategory.PythonExpressionToken, new NumberGenerator());
    registerNodeCateogry(NUMERIC_LITERAL, NodeCategory.HtmlAttributeValue, new NumberGenerator());
  }
}

class NullGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [new SuggestedNode(new NullLiteral(null), 'null', 'null', true, 'null')];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [];
  }
}

export class NullLiteral extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, NULL_LITERAL);
    this.properties = {};
  }

  generateJsAst() {
    return recast.types.builders.nullLiteral();
  }

  static deserializer(serializedNode: SerializedNode) : NullLiteral {
    return new NullLiteral(null);
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = NULL_LITERAL;
    typeRegistration.deserializer = NullLiteral.deserializer;
    typeRegistration.properties = [];
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'null'),
    ]);
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
    registerType(typeRegistration);
    registerNodeCateogry(NULL_LITERAL, NodeCategory.ExpressionToken, new NullGenerator());
  }
}
