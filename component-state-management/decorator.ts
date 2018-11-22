import { StateService } from './state.service';

export let _stateService = new StateService();

/* Decorators */
export function State(stateSettings: StateDecoratorSettings): ClassDecorator {
    return function (constructor: any) {
        const LIFECYCLE_HOOKS = [
            'ngOnInit',
            'ngOnDestroy'
        ];

        LIFECYCLE_HOOKS.forEach(hook => {
            const originalFunction = constructor.prototype[hook];
            let newfunction: Function = undefined;
            if (hook == 'ngOnInit') {
                newfunction = gettingComponentState(stateSettings, originalFunction);
            }
            else if (hook == 'ngOnDestroy') {
                newfunction = savingComponentState(stateSettings, originalFunction)
            }
            constructor.prototype[hook] = newfunction;
        });
    }
}

export function SaveComponentState(stateSettings: StateDecoratorSettings): MethodDecorator {
    return function (target: any, propertyKey: string,
        descriptor: PropertyDescriptor) {
        descriptor.value = savingComponentState(stateSettings, descriptor.value);
        return descriptor;
    };
}

export function GetComponentState(stateSettings: StateDecoratorSettings): MethodDecorator {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        
        descriptor.value = gettingComponentState(stateSettings, descriptor.value);
        return descriptor;
    };
}

export function RemoveComponentState(stateSettings: StateDecoratorSettings): MethodDecorator {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let orignalFunction = descriptor.value;
        let newFunction = function () {
            
            switch (stateSettings.whenToRemoveState) {
                case MethodFilter.BeforeExecution:
                    {
                        removeComponentStateFunctionForDecorator(stateSettings)
                        orignalFunction.bind(this)();
                        break;
                    }
                case MethodFilter.AfterExecution:
                    {
                        orignalFunction.bind(this)();
                        removeComponentStateFunctionForDecorator(stateSettings);
                        break;
                    }
            }
        }
        descriptor.value = newFunction;
        return descriptor;
    };
}
export function GetAndSetComponentState(stateSettings: StateDecoratorSettings): MethodDecorator {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        
        descriptor.value = gettingAndSettingComponentState(stateSettings, descriptor.value);
        return descriptor;
    };
}
/* end decorators */


/* helper functions */

function gettingComponentState(stateSettings: StateDecoratorSettings, originalFunction) {
    let newFunction = function () {
        switch (stateSettings.whenToGetState) {
            case MethodFilter.BeforeExecution:
                {
                    getComponentStateFunction.bind(this)(stateSettings)
                    originalFunction && originalFunction.bind(this)(...Array.from(arguments));
                    break;
                }
            case MethodFilter.AfterExecution:
                {
                    originalFunction && originalFunction.bind(this)(...Array.from(arguments));
                    getComponentStateFunction.bind(this)(stateSettings);
                    break;
                }
        }
    }
    return newFunction;
}
function savingComponentState(stateSettings: StateDecoratorSettings, originalFunction) {
    let newFunction = function () {
        
        switch (stateSettings.whenToSaveState) {
            case MethodFilter.BeforeExecution:
                {
                    saveComponentStateFunction.bind(this)(stateSettings)
                    originalFunction && originalFunction.bind(this)(...Array.from(arguments));
                    break;
                }
            case MethodFilter.AfterExecution:
                {
                    originalFunction && originalFunction.bind(this)(...Array.from(arguments));
                    saveComponentStateFunction.bind(this)(stateSettings)
                    break;
                }
        }
    }
    return newFunction;
}
function gettingAndSettingComponentState(stateSettings: StateDecoratorSettings, originalFunction) {
    let newFunction = function () {
        switch (stateSettings.whenToGetState) {
            case MethodFilter.BeforeExecution:
                {
                    getComponentStateFunction.bind(this)(stateSettings)
                    originalFunction && originalFunction.bind(this)(...Array.from(arguments));
                    saveComponentStateFunction.bind(this)(stateSettings)
                    break;
                }
            case MethodFilter.AfterExecution:
                {
                    saveComponentStateFunction.bind(this)(stateSettings)
                    originalFunction && originalFunction.bind(this)(...Array.from(arguments));
                    getComponentStateFunction.bind(this)(stateSettings);
                    break;
                }
        }
    }
    return newFunction;
}
function saveComponentStateFunction(stateSettings: StateDecoratorSettings) {
    let state = {};
    stateSettings.properties.forEach(property => state[property] = this[property]);
    if (stateSettings.componentPropertyToUseAsKey) {
        //component with multiple states
        let currentComponentState = _stateService.getState(stateSettings.nameOfComponent);
        currentComponentState = currentComponentState ? currentComponentState : {};
        this[stateSettings.componentPropertyToUseAsKey] && (currentComponentState[this[stateSettings.componentPropertyToUseAsKey]] = state);
        state = currentComponentState
    }
    if (stateSettings.nameOfComponent) {
        _stateService.saveState(stateSettings.nameOfComponent, state);
    }
}
function getComponentStateFunction(stateSettings: StateDecoratorSettings) {
    let state = _stateService.getState(stateSettings.nameOfComponent);
    state = stateSettings.componentPropertyToUseAsKey && state ? state[this[stateSettings.componentPropertyToUseAsKey]] : state;

    this["stateExist"] = state;
    if (state) {
        stateSettings.properties.forEach(property => {
            if (property in state) {
                this[property] = state[property];
            }
        });
        stateSettings.functionsToExecuteAfterGettingState.forEach(functionToExecute => {
            if (this[functionToExecute] instanceof Function) {
                this[functionToExecute] && this[functionToExecute]();
            }
        });
    }
    else {
        if (stateSettings.functionsToExecuteIfUnableToGetState) {
            stateSettings.functionsToExecuteIfUnableToGetState.forEach(functionToExecute => {
                if (this[functionToExecute] instanceof Function) {
                    this[functionToExecute] && this[functionToExecute]();
                }
            });

        }
    }
}
export function removeComponentStateFunctionForDecorator(stateSettings: StateDecoratorSettings) {
    if (stateSettings.componentPropertyToUseAsKey && this[stateSettings.componentPropertyToUseAsKey]) {
        //component with multiple states
        let currentComponentState = _stateService.getState(stateSettings.nameOfComponent);
        currentComponentState && delete currentComponentState[this[stateSettings.componentPropertyToUseAsKey]];
        _stateService.saveState(stateSettings.nameOfComponent, currentComponentState);
    }
    else {
        _stateService.removeState(stateSettings.nameOfComponent);
    }
}
/**
 * removes state of single components 
 */
export function removeComponentStateFunction(nameOfComponent: string, internalKey: string = "") {
    
    if (internalKey)
        removeInternalStateFromComponentState(nameOfComponent, internalKey);
    else _stateService.removeState(nameOfComponent)
}
/**
 * removes state of multiple components 
 */
export function removeComponentsStateFunction(namesOfComponent: string[], internalKey: string = "") {
    //only if each component in namesOfComponent array has same internal key that needs to be removed
    
    namesOfComponent.forEach(nameOfComponent => {
        if (internalKey)
            removeInternalStateFromComponentState(nameOfComponent, internalKey);
        else _stateService.removeState(nameOfComponent)
    });
}
function removeInternalStateFromComponentState(nameOfComponent: string, internalKey: string) {
    let currentComponentState = _stateService.getState(nameOfComponent);
    currentComponentState && delete currentComponentState[internalKey];
    _stateService.saveState(nameOfComponent, currentComponentState);
}
export enum MethodFilter { BeforeExecution, AfterExecution }

export class StateDecoratorSettings {
    nameOfComponent: string;
    componentPropertyToUseAsKey?: string;
    properties?: string[] = [];
    functionsToExecuteAfterGettingState?: string[] = [];
    functionsToExecuteIfUnableToGetState?: string[] = [];
    whenToSaveState?: MethodFilter;
    whenToGetState?: MethodFilter;
    whenToRemoveState?: MethodFilter;
}