import { Injectable } from '@angular/core';

@Injectable()
export class StateService {

    private states = {};

    public saveState(key, state) {
        this.states[key] = state;
    }

    public getState(key) {
        return this.states[key];
    }
    public removeState(key) {
        return delete this.states[key];
    }
 
}