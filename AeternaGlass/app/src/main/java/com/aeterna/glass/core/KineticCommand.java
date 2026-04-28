package com.aeterna.glass.core;

public class KineticCommand {
    public String action;
    public int id;
    public boolean isHighPriority;
    public String text = "";
    public String url = "";
    public String command = "";
    public int direction = 0;
    public String packageName = "";
    public int x = -1;
    public int y = -1;
    public int amount = 0;
    public long waitMs = 0;
    public String assertText = "";
    public String verifyType = "";
    public String verifyValue = "";
    public String fact = "";
    public String memoryId = "";
    public String message = "";

    public KineticCommand(String action, int id, boolean isHighPriority) {
        this.action = action;
        this.id = id;
        this.isHighPriority = isHighPriority;
    }
}
