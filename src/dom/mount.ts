function mount(element: HTMLElement, vdom: VirtualElement) : HTMLElement | Text {

    if((vdom as any).mountToRiftComponent) {
        return element.appendChild(renderComponent(new (vdom as any)() as Component))
    }

    if((vdom as Component).isRiftComponent) {
        return element.appendChild(renderComponent(vdom as Component))
    }

    return element.appendChild(render(vdom))
}