const components = {
    _registered_components: {},
    register: (comp: Component, name?: string) => {
        // @ts-ignore
        if(!name) name = comp.name

        components._registered_components[name] = comp
    },

    get: (name: string): Component => components._registered_components[name],
    has: (name: string): boolean => !!components._registered_components[name]
}

// @ts-ignore
window.registerComponent = components.register

// @ts-ignore
window.components = components