/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */
'use strict';

import ReactNative, { ViewPropTypes, StyleSheet, Text, TouchableWithoutFeedback, Platform, requireNativeComponent } from 'react-native';
import React, { Component } from 'react';
const DocumentSelectionState = require('react-native/Libraries/vendor/document/selection/DocumentSelectionState');
const EventEmitter = require('react-native/Libraries/vendor/emitter/EventEmitter');
const NativeMethodsMixin = require('react-native/Libraries/Renderer/shims/NativeMethodsMixin');
const TextAncestor = require('react-native/Libraries/Text/TextAncestor');
const TextInputState = require('./TextInputState');
const UIManager = require('react-native/Libraries/ReactNative/UIManager');

const emptyFunction = require('fbjs/lib/emptyFunction');
const invariant = require('fbjs/lib/invariant');
const warning = require('fbjs/lib/warning');

import type {ColorValue} from 'StyleSheetTypes';
import type {TextStyleProp} from 'StyleSheet';
import type {ViewProps} from 'ViewPropTypes';

let AndroidTextInput;
let RCTMultilineTextInputView;
let RCTSinglelineTextInputView;

if (Platform.OS === 'android') {
  AndroidTextInput = requireNativeComponent('SecureAndroidTextInput');
} else if (Platform.OS === 'ios') {
  RCTMultilineTextInputView = requireNativeComponent(
    'RCTMultilineTextInputView',
  );
  RCTSinglelineTextInputView = requireNativeComponent(
    'RCTSinglelineTextInputView',
  );
}

const onlyMultiline = {
  onTextInput: true,
  children: true,
};

type Event = Object;
type Selection = {
  start: number,
  end?: number,
};

const DataDetectorTypes = [
  'phoneNumber',
  'link',
  'address',
  'calendarEvent',
  'none',
  'all',
];

type DataDetectorTypesType =
  | 'phoneNumber'
  | 'link'
  | 'address'
  | 'calendarEvent'
  | 'none'
  | 'all';

type KeyboardType =
  // Cross Platform
  | 'default'
  | 'email-address'
  | 'numeric'
  | 'phone-pad'
  | 'number-pad'
  | 'decimal-pad'
  // iOS-only
  | 'ascii-capable'
  | 'numbers-and-punctuation'
  | 'url'
  | 'name-phone-pad'
  | 'twitter'
  | 'web-search'
  // Android-only
  | 'visible-password';

type ReturnKeyType =
  // Cross Platform
  | 'done'
  | 'go'
  | 'next'
  | 'search'
  | 'send'
  // Android-only
  | 'none'
  | 'previous'
  // iOS-only
  | 'default'
  | 'emergency-call'
  | 'google'
  | 'join'
  | 'route'
  | 'yahoo';

type AutoCapitalize = 'none' | 'sentences' | 'words' | 'characters';

type IOSProps = $ReadOnly<{|
  spellCheck?: ?boolean,
  keyboardAppearance?: ?('default' | 'light' | 'dark'),
  enablesReturnKeyAutomatically?: ?boolean,
  selectionState?: ?DocumentSelectionState,
  clearButtonMode?: ?('never' | 'while-editing' | 'unless-editing' | 'always'),
  clearTextOnFocus?: ?boolean,
  dataDetectorTypes?:
    | ?DataDetectorTypesType
    | $ReadOnlyArray<DataDetectorTypesType>,
  inputAccessoryViewID?: ?string,
  textContentType?: ?(
    | 'none'
    | 'URL'
    | 'addressCity'
    | 'addressCityAndState'
    | 'addressState'
    | 'countryName'
    | 'creditCardNumber'
    | 'emailAddress'
    | 'familyName'
    | 'fullStreetAddress'
    | 'givenName'
    | 'jobTitle'
    | 'location'
    | 'middleName'
    | 'name'
    | 'namePrefix'
    | 'nameSuffix'
    | 'nickname'
    | 'organizationName'
    | 'postalCode'
    | 'streetAddressLine1'
    | 'streetAddressLine2'
    | 'sublocality'
    | 'telephoneNumber'
    | 'username'
    | 'password'
  ),
  scrollEnabled?: ?boolean,
|}>;

type AndroidProps = $ReadOnly<{|
  returnKeyLabel?: ?string,
  numberOfLines?: ?number,
  disableFullscreenUI?: ?boolean,
  textBreakStrategy?: ?('simple' | 'highQuality' | 'balanced'),
  underlineColorAndroid?: ?ColorValue,
  inlineImageLeft?: ?string,
  inlineImagePadding?: ?number,
|}>;

type Props = $ReadOnly<{|
  ...ViewProps,
  ...IOSProps,
  ...AndroidProps,
  autoCapitalize?: ?AutoCapitalize,
  autoCorrect?: ?boolean,
  autoFocus?: ?boolean,
  allowFontScaling?: ?boolean,
  editable?: ?boolean,
  keyboardType?: ?KeyboardType,
  returnKeyType?: ?ReturnKeyType,
  maxLength?: ?number,
  multiline?: ?boolean,
  onBlur?: ?Function,
  onFocus?: ?Function,
  onChange?: ?Function,
  onChangeText?: ?Function,
  onContentSizeChange?: ?Function,
  onTextInput?: ?Function,
  onEndEditing?: ?Function,
  onSelectionChange?: ?Function,
  onSubmitEditing?: ?Function,
  onKeyPress?: ?Function,
  onScroll?: ?Function,
  placeholder?: ?Stringish,
  placeholderTextColor?: ?ColorValue,
  secureTextEntry?: ?boolean,
  selectionColor?: ?ColorValue,
  selection?: ?$ReadOnly<{|
    start: number,
    end?: ?number,
  |}>,
  value?: ?Stringish,
  defaultValue?: ?Stringish,
  selectTextOnFocus?: ?boolean,
  blurOnSubmit?: ?boolean,
  style?: ?TextStyleProp,
  caretHidden?: ?boolean,
  contextMenuHidden?: ?boolean,
|}>;

/**
 * A foundational component for inputting text into the app via a
 * keyboard. Props provide configurability for several features, such as
 * auto-correction, auto-capitalization, placeholder text, and different keyboard
 * types, such as a numeric keypad.
 *
 * The simplest use case is to plop down a `TextInput` and subscribe to the
 * `onChangeText` events to read the user input. There are also other events,
 * such as `onSubmitEditing` and `onFocus` that can be subscribed to.
 *
 *
 * `TextInput` has by default a border at the bottom of its view. This border
 * has its padding set by the background image provided by the system, and it
 * cannot be changed. Solutions to avoid this is to either not set height
 * explicitly, case in which the system will take care of displaying the border
 * in the correct position, or to not display the border by setting
 * `underlineColorAndroid` to transparent.
 *
 * Note that on Android performing text selection in input can change
 * app's activity `windowSoftInputMode` param to `adjustResize`.
 * This may cause issues with components that have position: 'absolute'
 * while keyboard is active. To avoid this behavior either specify `windowSoftInputMode`
 * in AndroidManifest.xml ( https://developer.android.com/guide/topics/manifest/activity-element.html )
 * or control this param programmatically with native code.
 *
 */

class TextInput extends Component {



  constructor() {
    super();
    this.state = {
        currentlyFocusedField: TextInputState.currentlyFocusedField,
        focusTextInput: TextInputState.focusTextInput,
        blurTextInput: TextInputState.blurTextInput,
    };
    this._inputRef = (undefined: any);
    this._focusSubscription = (undefined: ?Function);
    this._lastNativeText = (undefined: ?string);
    this._lastNativeSelection = (undefined: ?Selection);
  };

  getDefaultProps(): Object {
    return {
      allowFontScaling: true,
      underlineColorAndroid: 'transparent',
    };
  };

  /**
   * Returns `true` if the input is currently focused; `false` otherwise.
   */
  isFocused(): boolean {
    return (
      TextInputState.currentlyFocusedField() ===
      ReactNative.findNodeHandle(this._inputRef)
    );
  };

  componentDidMount() {
    this._lastNativeText = this.props.value;
    const tag = ReactNative.findNodeHandle(this._inputRef);
    if (tag != null) {
      // tag is null only in unit tests
      TextInputState.registerInput(tag);
    }

    if (this.context.focusEmitter) {
      this._focusSubscription = this.context.focusEmitter.addListener(
        'focus',
        el => {
          if (this === el) {
            this.requestAnimationFrame(this.focus);
          } else if (this.isFocused()) {
            this.blur();
          }
        },
      );
      if (this.props.autoFocus) {
        this.context.onFocusRequested(this);
      }
    } else {
      if (this.props.autoFocus) {
        this.requestAnimationFrame(this.focus);
      }
    }
  };

  componentWillUnmount() {
    this._focusSubscription && this._focusSubscription.remove();
    if (this.isFocused()) {
      this.blur();
    }
    const tag = ReactNative.findNodeHandle(this._inputRef);
    if (tag != null) {
      TextInputState.unregisterInput(tag);
    }
  };

  /**
   * Removes all text from the `TextInput`.
   */
  clear = () => {
    this.setNativeProps({text: ''});
  };

  render() {
    let textInput;
    if (Platform.OS === 'ios') {
      textInput = UIManager.RCTVirtualText
        ? this._renderIOS()
        : this._renderIOSLegacy();
    } else if (Platform.OS === 'android') {
      textInput = this._renderAndroid();
    }
    return (
      <TextAncestor.Provider value={true}>{textInput}</TextAncestor.Provider>
    );
  };

  _getText(): ?string {
    return typeof this.props.value === 'string'
      ? this.props.value
      : typeof this.props.defaultValue === 'string'
        ? this.props.defaultValue
        : '';
  };

  _setNativeRef(ref: any) {
    this._inputRef = ref;
  };

  _renderIOSLegacy() {
    let textContainer;

    const props = Object.assign({}, this.props);
    props.style = [this.props.style];

    if (props.selection && props.selection.end == null) {
      props.selection = {
        start: props.selection.start,
        end: props.selection.start,
      };
    }

    if (!props.multiline) {
      if (__DEV__) {
        for (const propKey in onlyMultiline) {
          if (props[propKey]) {
            const error = new Error(
              'TextInput prop `' +
                propKey +
                '` is only supported with multiline.',
            );
            warning(false, '%s', error.stack);
          }
        }
      }
      textContainer = (
        <RCTSinglelineTextInputView
          ref={this._setNativeRef}
          {...props}
          onFocus={this._onFocus}
          onBlur={this._onBlur}
          onChange={this._onChange}
          onSelectionChange={this._onSelectionChange}
          onSelectionChangeShouldSetResponder={emptyFunction.thatReturnsTrue}
          text={this._getText()}
        />
      );
    } else {
      let children = props.children;
      let childCount = 0;
      React.Children.forEach(children, () => ++childCount);
      invariant(
        !(props.value && childCount),
        'Cannot specify both value and children.',
      );
      if (childCount >= 1) {
        children = (
          <Text style={props.style} allowFontScaling={props.allowFontScaling}>
            {children}
          </Text>
        );
      }
      if (props.inputView) {
        children = [children, props.inputView];
      }
      props.style.unshift(styles.multilineInput);
      textContainer = (
        <RCTMultilineTextInputView
          ref={this._setNativeRef}
          {...props}
          children={children}
          onFocus={this._onFocus}
          onBlur={this._onBlur}
          onChange={this._onChange}
          onContentSizeChange={this.props.onContentSizeChange}
          onSelectionChange={this._onSelectionChange}
          onTextInput={this._onTextInput}
          onSelectionChangeShouldSetResponder={emptyFunction.thatReturnsTrue}
          text={this._getText()}
          dataDetectorTypes={this.props.dataDetectorTypes}
          onScroll={this._onScroll}
        />
      );
    }

    return (
      <TouchableWithoutFeedback
        onLayout={props.onLayout}
        onPress={this._onPress}
        rejectResponderTermination={true}
        accessible={props.accessible}
        accessibilityLabel={props.accessibilityLabel}
        accessibilityRole={props.accessibilityRole}
        accessibilityStates={props.accessibilityStates}
        nativeID={this.props.nativeID}
        testID={props.testID}>
        {textContainer}
      </TouchableWithoutFeedback>
    );
  };

  _renderIOS() {
    const props = Object.assign({}, this.props);
    props.style = [this.props.style];

    if (props.selection && props.selection.end == null) {
      props.selection = {
        start: props.selection.start,
        end: props.selection.start,
      };
    }

    const RCTTextInputView = props.multiline
      ? RCTMultilineTextInputView
      : RCTSinglelineTextInputView;

    if (props.multiline) {
      props.style.unshift(styles.multilineInput);
    }

    const textContainer = (
      <RCTTextInputView
        ref={this._setNativeRef}
        {...props}
        onFocus={this._onFocus}
        onBlur={this._onBlur}
        onChange={this._onChange}
        onContentSizeChange={this.props.onContentSizeChange}
        onSelectionChange={this._onSelectionChange}
        onTextInput={this._onTextInput}
        onSelectionChangeShouldSetResponder={emptyFunction.thatReturnsTrue}
        text={this._getText()}
        dataDetectorTypes={this.props.dataDetectorTypes}
        onScroll={this._onScroll}
      />
    );

    return (
      <TouchableWithoutFeedback
        onLayout={props.onLayout}
        onPress={this._onPress}
        rejectResponderTermination={true}
        accessible={props.accessible}
        accessibilityLabel={props.accessibilityLabel}
        accessibilityRole={props.accessibilityRole}
        accessibilityStates={props.accessibilityStates}
        nativeID={this.props.nativeID}
        testID={props.testID}>
        {textContainer}
      </TouchableWithoutFeedback>
    );
  };

  _renderAndroid() {
    const props = Object.assign({}, this.props);
    props.style = [this.props.style];
    /*props.autoCapitalize =
      UIManager.AndroidTextInput.Constants.AutoCapitalizationType[
        props.autoCapitalize || 'sentences'
      ]; */
    /* $FlowFixMe(>=0.53.0 site=react_native_fb,react_native_oss) This comment
     * suppresses an error when upgrading Flow's support for React. To see the
     * error delete this comment and run Flow. */
    let children = this.props.children;
    let childCount = 0;
    React.Children.forEach(children, () => ++childCount);
    invariant(
      !(this.props.value && childCount),
      'Cannot specify both value and children.',
    );
    if (childCount > 1) {
      children = <Text>{children}</Text>;
    }

    if (props.selection && props.selection.end == null) {
      props.selection = {
        start: props.selection.start,
        end: props.selection.start,
      };
    }

    const textContainer = (
      <AndroidTextInput
        ref={this._setNativeRef}
        {...props}
        mostRecentEventCount={0}
        onFocus={this._onFocus}
        onBlur={this._onBlur}
        onChange={this._onChange}
        onSelectionChange={this._onSelectionChange}
        onTextInput={this._onTextInput}
        text={this._getText()}
        children={children}
        disableFullscreenUI={this.props.disableFullscreenUI}
        textBreakStrategy={this.props.textBreakStrategy}
        onScroll={this._onScroll}
      />
    );

    return (
      <TouchableWithoutFeedback
        onLayout={props.onLayout}
        onPress={this._onPress}
        accessible={this.props.accessible}
        accessibilityLabel={this.props.accessibilityLabel}
        accessibilityRole={this.props.accessibilityRole}
        accessibilityStates={this.props.accessibilityStates}
        nativeID={this.props.nativeID}
        testID={this.props.testID}>
        {textContainer}
      </TouchableWithoutFeedback>
    );
  };

  _onFocus(event: Event) {
    if (this.props.onFocus) {
      this.props.onFocus(event);
    }

    if (this.props.selectionState) {
      this.props.selectionState.focus();
    }
  };

  _onPress(event: Event) {
    if (this.props.editable || this.props.editable === undefined) {
      this.focus();
    }
  };

  _onChange(event: Event) {
    // Make sure to fire the mostRecentEventCount first so it is already set on
    // native when the text value is set.
    if (this._inputRef) {
      this._inputRef.setNativeProps({
        mostRecentEventCount: event.nativeEvent.eventCount,
      });
    }

    const text = event.nativeEvent.text;
    this.props.onChange && this.props.onChange(event);
    this.props.onChangeText && this.props.onChangeText(text);

    if (!this._inputRef) {
      // calling `this.props.onChange` or `this.props.onChangeText`
      // may clean up the input itself. Exits here.
      return;
    }

    this._lastNativeText = text;
    this.forceUpdate();
  };

  _onSelectionChange(event: Event) {
    this.props.onSelectionChange && this.props.onSelectionChange(event);

    if (!this._inputRef) {
      // calling `this.props.onSelectionChange`
      // may clean up the input itself. Exits here.
      return;
    }

    this._lastNativeSelection = event.nativeEvent.selection;

    if (this.props.selection || this.props.selectionState) {
      this.forceUpdate();
    }
  };

  componentDidUpdate() {
    // This is necessary in case native updates the text and JS decides
    // that the update should be ignored and we should stick with the value
    // that we have in JS.
    const nativeProps = {};

    if (
      this._lastNativeText !== this.props.value &&
      typeof this.props.value === 'string'
    ) {
      nativeProps.text = this.props.value;
    }

    // Selection is also a controlled prop, if the native value doesn't match
    // JS, update to the JS value.
    const {selection} = this.props;
    if (
      this._lastNativeSelection &&
      selection &&
      (this._lastNativeSelection.start !== selection.start ||
        this._lastNativeSelection.end !== selection.end)
    ) {
      nativeProps.selection = this.props.selection;
    }

    if (Object.keys(nativeProps).length > 0 && this._inputRef) {
      this._inputRef.setNativeProps(nativeProps);
    }

    if (this.props.selectionState && selection) {
      this.props.selectionState.update(selection.start, selection.end);
    }
  };

  _onBlur(event: Event) {
    this.blur();
    if (this.props.onBlur) {
      this.props.onBlur(event);
    }

    if (this.props.selectionState) {
      this.props.selectionState.blur();
    }
  };

  _onTextInput(event: Event) {
    this.props.onTextInput && this.props.onTextInput(event);
  };

  _onScroll(event: Event) {
    this.props.onScroll && this.props.onScroll(event);
  };
};

const styles = StyleSheet.create({
  multilineInput: {
    // This default top inset makes RCTMultilineTextInputView seem as close as possible
    // to single-line RCTSinglelineTextInputView defaults, using the system defaults
    // of font size 17 and a height of 31 points.
    paddingTop: 5,
  },
});

export default TextInput;
