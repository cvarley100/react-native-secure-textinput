package com.cvarley100.textinput;

import android.app.Activity;

import java.util.*;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.cvarley100.textinput.RNSecureTextInputManager;

public class RNSecureTextInputPackage implements ReactPackage {

    @Override
    public List<NativeModule>
    createNativeModules(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
    public List<Class<? extends JavaScriptModule>> createJSModules() {
        return Collections.emptyList();
    }
    @Override
    public List<ViewManager>
    createViewManagers(ReactApplicationContext reactContext) {
         return Collections.<ViewManager>singletonList(
            new RNSecureTextInputManager()
        );
    }
}
