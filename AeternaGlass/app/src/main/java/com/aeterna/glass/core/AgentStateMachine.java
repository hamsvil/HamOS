package com.aeterna.glass.core;

import android.util.Log;

public class AgentStateMachine {
    private static final String TAG = "AgentStateMachine";
    
    public enum State {
        IDLE, PLANNING, EXECUTING, WAITING_AI, INTERRUPTED, TASK_TIMEOUT, PAUSED, DONE, FATAL_ERROR
    }

    public enum Event {
        START_GOAL, PLAN_READY, STEP_DONE, ANOMALY_DETECTED, TIMEOUT_REACHED, REPLAN_DONE, MAX_RETRIES_EXCEEDED, ALL_TASKS_DONE, PAUSE, RESUME, ERROR
    }

    private State currentState = State.IDLE;
    private StateChangeListener listener;

    public interface StateChangeListener {
        void onStateChanged(State oldState, State newState, Event triggerEvent);
    }

    public void setListener(StateChangeListener listener) {
        this.listener = listener;
    }

    public synchronized void dispatch(Event event) {
        State oldState = currentState;
        boolean changed = false;

        switch (currentState) {
            case IDLE:
                if (event == Event.START_GOAL) { currentState = State.PLANNING; changed = true; }
                else if (event == Event.RESUME) { currentState = State.EXECUTING; changed = true; }
                break;
            case PLANNING:
                if (event == Event.PLAN_READY) { currentState = State.EXECUTING; changed = true; }
                else if (event == Event.START_GOAL) { currentState = State.PLANNING; changed = true; }
                else if (event == Event.ERROR) { currentState = State.FATAL_ERROR; changed = true; }
                break;
            case EXECUTING:
                if (event == Event.STEP_DONE) { currentState = State.EXECUTING; changed = true; }
                else if (event == Event.START_GOAL) { currentState = State.PLANNING; changed = true; }
                else if (event == Event.ANOMALY_DETECTED) { currentState = State.INTERRUPTED; changed = true; }
                else if (event == Event.TIMEOUT_REACHED) { currentState = State.TASK_TIMEOUT; changed = true; }
                else if (event == Event.ALL_TASKS_DONE) { currentState = State.DONE; changed = true; }
                else if (event == Event.PAUSE) { currentState = State.PAUSED; changed = true; }
                else if (event == Event.ERROR) { currentState = State.FATAL_ERROR; changed = true; }
                break;
            case INTERRUPTED:
                if (event == Event.REPLAN_DONE) { currentState = State.EXECUTING; changed = true; }
                else if (event == Event.ERROR) { currentState = State.FATAL_ERROR; changed = true; }
                break;
            case TASK_TIMEOUT:
                if (event == Event.MAX_RETRIES_EXCEEDED) { currentState = State.FATAL_ERROR; changed = true; }
                else if (event == Event.REPLAN_DONE) { currentState = State.EXECUTING; changed = true; }
                else if (event == Event.ALL_TASKS_DONE) { currentState = State.DONE; changed = true; }
                else if (event == Event.ERROR) { currentState = State.FATAL_ERROR; changed = true; }
                break;
            case PAUSED:
                if (event == Event.RESUME) { currentState = State.EXECUTING; changed = true; }
                else if (event == Event.START_GOAL) { currentState = State.PLANNING; changed = true; }
                break;
            case DONE:
            case FATAL_ERROR:
                if (event == Event.START_GOAL) { currentState = State.PLANNING; changed = true; }
                break;
            case WAITING_AI:
                if (event == Event.PLAN_READY) { currentState = State.EXECUTING; changed = true; }
                else if (event == Event.ERROR) { currentState = State.FATAL_ERROR; changed = true; }
                break;
        }

        if (changed) {
            Log.d(TAG, "State transition: " + oldState + " -> " + currentState + " on " + event);
            if (listener != null) {
                listener.onStateChanged(oldState, currentState, event);
            }
        }
    }

    public State getCurrentState() {
        return currentState;
    }
}
