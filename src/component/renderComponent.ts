function renderComponent(comp: Component) : HTMLElement | Text {
    comp._render()

    let returnValue: HTMLElement | Text = render(comp as VirtualElement)

    comp.dom = returnValue as HTMLElement

    return returnValue
}