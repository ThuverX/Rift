const diffChildren = function(v1 : VirtualElement[], v2: VirtualElement[]) : (HTMLElement) => void {
    const childPatches: ((HTMLElement) => void) [] = []

    v1.map((oldChild: VirtualElement, i: number) => 
        childPatches.push(diff(oldChild, v2[i])))

    const addPatches: ((HTMLElement) => void) [] = []

    for (const addChild of v2.slice(v1.length)) {
        addPatches.push((NODE: HTMLElement) => 
            mount(NODE, addChild)
        )
    }

    return (PARENT_NODE: HTMLElement) => {
        for (const [patch, child] of Zip(childPatches, PARENT_NODE.childNodes)) 
            patch(child)

        for (const patch of addPatches) 
            patch(PARENT_NODE)
    }
}

const diffAttributes = function (v1: VirtualDomElementAttributes, v2: VirtualDomElementAttributes) : (HTMLElement) => void {
    const patches: ((HTMLElement) => void) [] = []

    for (const [key, value] of Object.entries(v2)) {
        patches.push((NODE: HTMLElement) => 
            applyAttribute(NODE, key, value)
        )
    }

    for (const k in v1) {
        if (!(k in v2)) {
            patches.push((NODE: HTMLElement) => 
                NODE.removeAttribute(k)
            )
        }
    }

    return (NODE: HTMLElement) => {
        for (const patch of patches)
            patch(NODE)
    }
}



function diff(v1: VirtualElement, v2: VirtualElement) : (HTMLElement) => void {
    if(!v1) {
        return (NODE: HTMLElement) => {
            NODE.remove()
        }
    }

    if((v1 as VirtualTextElement)?.value?.toString() != (v2 as VirtualTextElement)?.value?.toString()) {
        return (NODE: HTMLElement) => {
            let NEW_NODE: HTMLElement | Text = render(v2)
            NODE.replaceWith(NEW_NODE)
        }
    }

    if(v1.type !== v2.type) {
        return (NODE: HTMLElement) => {
            let NEW_NODE: HTMLElement | Text = render(v2)

            NODE.replaceWith(NEW_NODE)
        }
    }

    const attributesPatches = diffAttributes(v1.attributes || {}, v2.attributes || {})
    const childrenPatches = diffChildren(v1.children || [], v2.children || [])

    return (NODE: HTMLElement) => {
        attributesPatches(NODE)
        childrenPatches(NODE)
    }
}

function update(element: HTMLElement, v1: VirtualElement, v2: VirtualElement) : void {
    diff(v1,v2)(element)
}