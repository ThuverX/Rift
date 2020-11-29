function applyAttribute(element: HTMLElement, key: string, value: any) : void {
    if(typeof value == 'function') {
        element[key] = value
    } else {

        if(key == 'style' && typeof value == 'object') {
            for(let [k,v] of Object.entries(value)) {
                element['style'][k] = v
            }
        } else if(key == 'classlist') {
            if(Array.isArray(value)) element.setAttribute('class', value.filter(x => !!x).join(' '))
        } else {
            element.setAttribute(key,value)
        }
    }
}

function render(vdom: VirtualElement) : HTMLElement | Text {
    isVirtualDomElement(vdom)

    if(vdom.type !== 'Text') {
        if(components.has(vdom.type)) {
            return renderComponent(new (components.get(vdom.type) as any)(vdom.attributes, vdom.children))
        }

        let element : HTMLElement = document.createElement(vdom.type)

        if(vdom.attributes) {
            for(let [key,value] of Object.entries(vdom.attributes)) {
                applyAttribute(element, key, value)
            }
        }

        if(vdom.children) {
            for(let child of vdom.children) {
                mount(element, child)
            }
        }

        return element
    } else {
        if(vdom.children) {
            (vdom as VirtualTextElement).value = (vdom.children[0] as VirtualTextElement).value
        }
        let element: Text = document.createTextNode((vdom as VirtualTextElement).value)

        return element
    }
}