package com.goalforge.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.goalforge.app.disciplinelock.DisciplineLockPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DisciplineLockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
